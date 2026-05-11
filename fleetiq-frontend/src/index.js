/*

This is the entry point of the React application. 
It imports necessary modules and renders the main App component into the root DOM element. 
The React.StrictMode wrapper is used to highlight potential problems in the application during development.

*/
import React from 'react';    //enables JSX syntax and React features in this file
import ReactDOM from 'react-dom/client';    //connects react to browser 
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
