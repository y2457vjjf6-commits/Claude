import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/fraunces';
import '@fontsource/geist-sans/400.css';
import '@fontsource/geist-sans/500.css';
import '@fontsource/geist-sans/600.css';
import '@fontsource/geist-mono/400.css';
import '@fontsource/geist-mono/500.css';
import './index.css';
import './print.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);
