import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

const THEME_KEY = 'mandirector-theme';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  // 初始化主题
  useEffect(() => {
    setMounted(true);
    
    // 从localStorage获取保存的主题
    const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      // 默认使用深色主题
      setTheme('system');
      document.documentElement.setAttribute('data-theme', 'system');
    }
  }, []);

  // 监听系统主题偏好变化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    
    const handleChange = () => {
      if (theme === 'system') {
        // 当系统主题改变且当前设置为system时，不需要手动设置data-theme
        // CSS中的@media查询会自动处理
        // 但为了确保组件能正确获取actualTheme，我们触发一个重新渲染
        setTheme('system'); // 触发重新渲染但不改变localStorage
        document.documentElement.setAttribute('data-theme', 'system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // 切换主题
  const toggleTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // 获取当前实际主题（解析system模式）
  const getActualTheme = (): 'light' | 'dark' => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    return theme;
  };

  // 切换到下一个主题
  const cycleTheme = () => {
    const themes: Theme[] = ['dark', 'light', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    toggleTheme(themes[nextIndex]);
  };

  return {
    theme,
    setTheme: toggleTheme,
    toggleTheme: cycleTheme,
    actualTheme: getActualTheme(),
    mounted
  };
}