#!/usr/bin/env node

/**
 * Test script for content creation functionality
 * Tests both claims loading and content generation
 */

async function testContentCreation() {
  const baseUrl = 'http://localhost:3001';
  
  console.log('🧪 Testing Content Creation Functionality\n');
  
  try {
    // Test 1: Verify product context endpoint
    console.log('1️⃣ Testing Product Context Loading...');
    const productContextResponse = await fetch(`${baseUrl}/api/content/prepare-product-context`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add auth headers if needed
      },
      body: JSON.stringify({
        productId: 'test-product-id' // Replace with actual product ID
      })
    });
    
    const productContextData = await productContextResponse.json();
    console.log('Product Context Response:', JSON.stringify(productContextData, null, 2));
    
    if (productContextData.success && productContextData.styledClaims) {
      console.log('✅ Product context loaded successfully');
      console.log('   - Product Name:', productContextData.productName);
      console.log('   - Has Styled Claims:', !!productContextData.styledClaims);
    } else {
      console.log('❌ Product context failed:', productContextData.error || 'No styled claims');
    }
    
    console.log('\n2️⃣ Testing Content Generation...');
    
    // Test 2: Content generation with template
    const generateResponse = await fetch(`${baseUrl}/api/content/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add auth headers if needed
      },
      body: JSON.stringify({
        brand_id: 'test-brand-id', // Replace with actual brand ID
        template: {
          id: 'test-template-id',
          name: 'Test Template',
          inputFields: [
            {
              id: 'field1',
              name: 'Test Field',
              type: 'text',
              value: 'Test value'
            }
          ],
          outputFields: [
            {
              id: 'output1',
              name: 'Generated Content',
              type: 'richText',
              aiAutoComplete: true
            }
          ]
        },
        input: {
          product_context: productContextData.success ? {
            productName: productContextData.productName,
            styledClaims: productContextData.styledClaims
          } : null
        }
      })
    });
    
    const generateData = await generateResponse.json();
    console.log('Generate Response:', JSON.stringify(generateData, null, 2));
    
    if (generateData.success) {
      // Check for generated fields (excluding success, userId, error)
      const { success, userId, error, ...generatedFields } = generateData;
      if (Object.keys(generatedFields).length > 0) {
        console.log('✅ Content generated successfully');
        console.log('   - Generated fields:', Object.keys(generatedFields).join(', '));
      } else {
        console.log('❌ No content fields were generated');
      }
    } else {
      console.log('❌ Content generation failed:', generateData.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testContentCreation();