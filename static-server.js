const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the 'out' directory
app.use(express.static(path.join(__dirname, 'out')));

// For all routes, serve the index.html file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'out', 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 