import { useEffect, useState } from 'react';
import api from '../services/api';

const useBrandColors = (userId = null) => {
  const [loading, setLoading] = useState(true);
  const [colors, setColors] = useState({
    primaryColor: '#800080',
    secondaryColor: '#EE82EE',
    accentColor: '#9333ea'
  });

  useEffect(() => {
    const loadBrandColors = async () => {
      try {
        setLoading(true);
        
        // If userId provided, fetch public branding (for QR viewers)
        // Otherwise, fetch current user's branding
        const endpoint = userId 
          ? `/white-label/branding/${userId}`
          : '/white-label/branding';
        
        const response = await api.get(endpoint);
        
        if (response.data.status === 'success' && response.data.branding) {
          const branding = response.data.branding;
          
          const brandColors = {
            primaryColor: branding.primaryColor || '#800080',
            secondaryColor: branding.secondaryColor || '#EE82EE',
            accentColor: branding.accentColor || '#9333ea'
          };
          
          setColors(brandColors);
          
          // Apply CSS variables globally
          document.documentElement.style.setProperty('--brand-primary', brandColors.primaryColor);
          document.documentElement.style.setProperty('--brand-secondary', brandColors.secondaryColor);
          document.documentElement.style.setProperty('--accent-color', brandColors.accentColor);
          
          console.log('✅ Brand colors applied:', brandColors);
        } else {
          // Use defaults
          applyDefaultColors();
        }
      } catch (error) {
        console.log('⚠️ Using default brand colors');
        applyDefaultColors();
      } finally {
        setLoading(false);
      }
    };

    const applyDefaultColors = () => {
      const defaults = {
        primaryColor: '#800080',
        secondaryColor: '#EE82EE',
        accentColor: '#9333ea'
      };
      setColors(defaults);
      document.documentElement.style.setProperty('--brand-primary', defaults.primaryColor);
      document.documentElement.style.setProperty('--brand-secondary', defaults.secondaryColor);
      document.documentElement.style.setProperty('--accent-color', defaults.accentColor);
    };

    loadBrandColors();
  }, [userId]);

  return { colors, loading };
};

export default useBrandColors;