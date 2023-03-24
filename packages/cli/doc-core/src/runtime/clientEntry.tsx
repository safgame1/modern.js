import Theme from '@theme';
import { useState } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App, initPageData } from './App';
import { DataContext, ThemeContext } from './hooks';
import { normalizeRoutePath } from './utils';
import { isProduction } from '@/shared/utils/index';

export async function renderInBrowser() {
  const container = document.getElementById('root')!;
  const enhancedApp = async () => {
    const initialPageData = await initPageData(
      normalizeRoutePath(window.location.pathname),
    );
    return function RootApp() {
      const [data, setData] = useState(initialPageData);
      const [theme, setTheme] = useState<'light' | 'dark'>('light');
      return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
          <DataContext.Provider value={{ data, setData }}>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </DataContext.Provider>
        </ThemeContext.Provider>
      );
    };
  };
  const RootApp = await enhancedApp();
  if (isProduction()) {
    hydrateRoot(container, <RootApp />);
  } else {
    createRoot(container).render(<RootApp />);
  }
}

renderInBrowser().then(() => {
  Theme.setup();
});