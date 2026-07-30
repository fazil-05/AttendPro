// src/contexts/ThemeContext.tsx
// Pure Clean Light Theme Context

import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme] = useState<Theme>('light');

  useEffect(() => {
    localStorage.setItem('theme', 'light');
    document.body.classList.remove('dark');
    document.documentElement.classList.remove('dark');
  }, []);

  const toggleTheme = () => {
    // Pure light theme enforcement
    localStorage.setItem('theme', 'light');
    document.body.classList.remove('dark');
    document.documentElement.classList.remove('dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
