#!/bin/bash

# MixerAI 2.0 Convenience Script
# This script helps users navigate to the correct directory and run commands

# Display header
echo "MixerAI 2.0 Launcher"
echo "=================="
echo

# Check if we're in the right directory
if [ ! -d "mixerai-2.0" ]; then
  echo "Error: This script must be run from the root MixerAI 2.0a directory."
  echo "Current directory: $(pwd)"
  exit 1
fi

# Display options
echo "What would you like to do?"
echo "1) Run development server"
echo "2) Run with local database"
echo "3) Initialize/reset database"
echo "4) Fix folder structure (basic)"
echo "5) Copy all missing files to mixerai-2.0"
echo "6) Configure Supabase connection"
echo "7) Open shell in correct directory"
echo "q) Quit"
echo

# Get user choice
read -p "Enter your choice: " choice
echo

case $choice in
  1)
    echo "Running development server..."
    echo "Changing to mixerai-2.0 directory and running npm run dev"
    cd mixerai-2.0 && npm run dev
    ;;
    
  2)
    echo "Running with local database..."
    echo "Changing to mixerai-2.0 directory and running ./scripts/use-local-db.sh"
    cd mixerai-2.0 && ./scripts/use-local-db.sh
    ;;
    
  3)
    echo "Database management:"
    echo "1) Initialize database"
    echo "2) Reset database"
    echo "3) Clean database"
    echo "4) Add test user"
    echo "b) Back to main menu"
    echo
    read -p "Enter your choice: " db_choice
    echo
    
    case $db_choice in
      1)
        echo "Initializing database..."
        cd mixerai-2.0 && ./scripts/init-database.sh
        ;;
      2)
        echo "Resetting database..."
        cd mixerai-2.0 && ./scripts/reset-database.sh
        ;;
      3)
        echo "Cleaning database..."
        cd mixerai-2.0 && ./scripts/clean-database.sh
        ;;
      4)
        echo "Adding test user..."
        cd mixerai-2.0 && ./scripts/add-test-user.sh
        ;;
      b)
        exec $0
        ;;
      *)
        echo "Invalid choice."
        ;;
    esac
    ;;
    
  4)
    echo "Fixing folder structure (basic version)..."
    ./fix-folder-structure.sh
    ;;
    
  5)
    echo "Copying all missing files to mixerai-2.0..."
    ./copy-all-missing-files.sh
    ;;
    
  6)
    echo "Configuring Supabase connection..."
    ./update-supabase-config.sh
    ;;
    
  7)
    echo "Opening shell in correct directory..."
    echo "Changing to mixerai-2.0 directory"
    echo "Type 'exit' to return to the original shell"
    echo
    cd mixerai-2.0 && $SHELL
    ;;
    
  q)
    echo "Exiting."
    exit 0
    ;;
    
  *)
    echo "Invalid choice."
    ;;
esac

echo
echo "Remember: Always run commands from the mixerai-2.0 directory!"
echo "You can use this script again by running ./run-mixerai.sh" 