import { BrowserRouter } from 'react-router-dom';
import  ReactDOM  from 'react-dom/client'
import App from './App.jsx'
import { ThemeProvider } from './component/theme.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </BrowserRouter>
)
