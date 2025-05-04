"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/card";
import { Input } from "@/components/input";
import { useToast } from "@/components/toast-provider";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Plus, Trash2, Search, ChevronDown, ChevronUp } from "lucide-react";
import { BrandIcon } from "@/components/brand-icon";
import { COUNTRIES } from "@/lib/constants";

interface Brand {
  id: string;
  name: string;
  country: string;
  language: string;
  content_count: number;
  brand_color?: string;
  brand_summary?: string;
}

interface GroupedBrands {
  [key: string]: {
    country: string;
    countryName: string;
    brands: Brand[];
    isOpen: boolean;
  }
}

export default function BrandsPage() {
  const { toast } = useToast();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [groupedBrands, setGroupedBrands] = useState<GroupedBrands>({});
  
  const getCountryName = (countryCode: string) => {
    const country = COUNTRIES.find(c => c.value === countryCode);
    return country ? country.label : countryCode;
  };
  
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await fetch("/api/brands");
        const data = await response.json();
        
        if (data.success) {
          setBrands(data.brands);
          
          // Group brands by country
          const grouped: GroupedBrands = {};
          data.brands.forEach((brand: Brand) => {
            const countryCode = brand.country || "unknown";
            const countryName = getCountryName(countryCode);
            
            if (!grouped[countryCode]) {
              grouped[countryCode] = {
                country: countryCode,
                countryName: countryName,
                brands: [],
                isOpen: true
              };
            }
            
            grouped[countryCode].brands.push(brand);
          });
          
          // Sort countries alphabetically
          const sortedGrouped: GroupedBrands = {};
          Object.keys(grouped).sort((a, b) => {
            return grouped[a].countryName.localeCompare(grouped[b].countryName);
          }).forEach(key => {
            sortedGrouped[key] = grouped[key];
          });
          
          setGroupedBrands(sortedGrouped);
        } else {
          toast({
            title: "Error",
            description: data.error || "Failed to fetch brands",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error fetching brands:", error);
        toast({
          title: "Error",
          description: "Failed to fetch brands",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchBrands();
  }, [toast]);

  const filteredBrands = searchTerm.trim() === "" 
    ? groupedBrands 
    : Object.keys(groupedBrands).reduce((filtered: GroupedBrands, countryCode) => {
        const countryGroup = groupedBrands[countryCode];
        const filteredBrandsList = countryGroup.brands.filter(brand => 
          brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (brand.brand_summary && brand.brand_summary.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        
        if (filteredBrandsList.length > 0) {
          filtered[countryCode] = {
            ...countryGroup,
            brands: filteredBrandsList
          };
        }
        
        return filtered;
      }, {});
  
  const toggleCountryGroup = (countryCode: string) => {
    setGroupedBrands(prev => ({
      ...prev,
      [countryCode]: {
        ...prev[countryCode],
        isOpen: !prev[countryCode].isOpen
      }
    }));
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Brands</h1>
        <Button asChild>
          <Link href="/brands/new">
            <Plus className="mr-2 h-4 w-4" /> New Brand
          </Link>
        </Button>
      </div>
      
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search brands..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.keys(filteredBrands).length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No brands found</p>
            </div>
          ) : (
            Object.values(filteredBrands).map((group) => (
              <div key={group.country} className="border rounded-lg overflow-hidden">
                <div 
                  className="bg-muted p-4 flex justify-between items-center cursor-pointer"
                  onClick={() => toggleCountryGroup(group.country)}
                >
                  <h2 className="text-xl font-semibold flex items-center">
                    {group.countryName} <span className="ml-2 text-sm text-muted-foreground">({group.brands.length})</span>
                  </h2>
                  {group.isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
                
                {group.isOpen && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                    {group.brands.map((brand) => (
                      <Card key={brand.id} className="h-full flex flex-col">
                        <CardHeader className="pb-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2">
                              <BrandIcon
                                name={brand.name}
                                color={brand.brand_color}
                                size="lg"
                              />
                              <div>
                                <CardTitle className="text-xl">
                                  <Link href={`/brands/${brand.id}`}>
                                    {brand.name}
                                  </Link>
                                </CardTitle>
                                <CardDescription>
                                  {getCountryName(brand.country)} • {brand.language}
                                </CardDescription>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground"
                              asChild
                            >
                              <Link href={`/brands/${brand.id}/edit`}>
                                <span className="sr-only">Edit</span>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="h-4 w-4"
                                >
                                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                  <path d="m15 5 4 4" />
                                </svg>
                              </Link>
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="flex-grow">
                          {brand.brand_summary ? (
                            <p className="text-sm text-muted-foreground line-clamp-3">{brand.brand_summary}</p>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">No brand summary available</p>
                          )}
                        </CardContent>
                        <CardFooter className="pt-4 flex items-center justify-between border-t">
                          <div className="text-sm text-muted-foreground">
                            {brand.content_count} content item{brand.content_count !== 1 && "s"}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-muted-foreground hover:text-foreground"
                            asChild
                          >
                            <Link href={`/dashboard/content/new?brand=${brand.id}`}>
                              <Plus className="mr-1 h-3 w-3" />
                              Add content
                            </Link>
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
} 