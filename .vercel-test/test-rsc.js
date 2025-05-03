
    const React = require('react');
    // The following line will throw an error if the module is missing
    try {
      // Check if react-server-dom-webpack is available, but don't require a specific version
      console.log('✅ Checking for react-server-dom-webpack in modules...');
      if (require.resolve('react-server-dom-webpack')) {
        console.log('✅ react-server-dom-webpack is available');
      }
    } catch (error) {
      console.error('❌ react-server-dom-webpack module missing:', error.message);
      process.exit(1);
    }
  