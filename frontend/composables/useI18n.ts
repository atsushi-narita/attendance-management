import ja from '~/locales/ja.json'

export const useI18n = () => {
  const t = (key: string, fallback?: string): string => {
    const keys = key.split('.')
    let value: any = ja
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        return fallback || key
      }
    }
    
    return typeof value === 'string' ? value : fallback || key
  }

  return {
    t
  }
}