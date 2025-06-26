import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import { useAppContext } from '../../AppContext';
import AdDisplay from '../common/AdDisplay'; // Import AdDisplay
import { AdLocationKey } from '../../types'; // Import AdLocationKey

const MainLayout: React.FC = () => {
  const { adminSettings } = useAppContext();
  const location = useLocation();

  // Update general document head based on admin settings
  useEffect(() => {
    // Title
    let pageTitle = adminSettings.siteName;
    if (adminSettings.seoMetaTitleSuffix) {
      pageTitle = `${pageTitle} | ${adminSettings.seoMetaTitleSuffix}`;
    }
    // Specific pages might override this using their own effects or a Helmet-like solution
    if (location.pathname === '/') {
        // Potentially a more specific title for home
    } else if (location.pathname.startsWith('/match/')) {
        // MatchDetailPage will handle its own title
    }
    document.title = pageTitle;

    // Favicon
    let faviconLink = document.getElementById('favicon') as HTMLLinkElement | null;
    if (!faviconLink) {
      faviconLink = document.createElement('link');
      faviconLink.id = 'favicon';
      faviconLink.rel = 'icon';
      document.head.appendChild(faviconLink);
    }
    faviconLink.href = adminSettings.faviconUrl || '/favicon.ico';

    // Default Meta Description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', adminSettings.seoDefaultMetaDescription || '');

    // Default Meta Keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', adminSettings.seoDefaultMetaKeywords || '');
    
    // Default Open Graph Image
    let ogImage = document.querySelector('meta[property="og:image"]');
    if (!ogImage) {
      ogImage = document.createElement('meta');
      ogImage.setAttribute('property', 'og:image');
      document.head.appendChild(ogImage);
    }
    ogImage.setAttribute('content', adminSettings.seoOpenGraphImageUrl || '');

  }, [
    adminSettings.siteName, 
    adminSettings.faviconUrl, 
    adminSettings.seoDefaultMetaDescription, 
    adminSettings.seoDefaultMetaKeywords, 
    adminSettings.seoOpenGraphImageUrl,
    adminSettings.seoMetaTitleSuffix,
    location.pathname // Re-run if path changes for title updates
  ]);

  // Inject custom theme colors as CSS variables
  useEffect(() => {
    const styleId = 'custom-theme-vars';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    styleElement.innerHTML = `
      :root {
        --theme-primary: ${adminSettings.themePrimaryColor || '#007bff'};
        --theme-secondary: ${adminSettings.themeSecondaryColor || '#6f42c1'};
        --theme-accent: ${adminSettings.themeAccentColor || '#10B981'};
      }
    `;
  }, [adminSettings.themePrimaryColor, adminSettings.themeSecondaryColor, adminSettings.themeAccentColor]);


  // Inject custom header code (for non-ad global scripts)
  useEffect(() => {
    const head = document.head;
    const customElementsContainerId = 'custom-header-elements';
    
    let container = head.querySelector(`#${customElementsContainerId}`);
    if (container) {
      head.removeChild(container);
    }

    container = document.createElement('div');
    container.id = customElementsContainerId;
    
    if (adminSettings.headerCode) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = adminSettings.headerCode;
      Array.from(tempDiv.childNodes).forEach(node => {
        container!.appendChild(node.cloneNode(true)); 
      });
    }
    
    if (container.hasChildNodes()) {
         head.appendChild(container);
    }

    return () => {
      if (container && head.contains(container)) {
         try {
           head.removeChild(container);
         } catch (e) { /* ignore */ }
      }
    };
  }, [adminSettings.headerCode]);


  return (
    <div className="min-h-screen flex flex-col bg-neutral-dark text-neutral-text">
      <Header />
      <AdDisplay locationKey={AdLocationKey.HEADER_BANNER} className="container mx-auto px-4 sm:px-6 lg:px-8" />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      <AdDisplay locationKey={AdLocationKey.FOOTER_BANNER} className="container mx-auto px-4 sm:px-6 lg:px-8" />
      <Footer />
    </div>
  );
};

export default MainLayout;