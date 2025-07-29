// Utility function for handling image URLs in frontend
export const getImageUrl = (imageUrl: string, serverUrl: string = import.meta.env.VITE_API_URL || 'http://localhost:3001') => {
    // If the URL is already absolute, return as-is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    // If it's a relative URL, prepend the server URL
    if (imageUrl.startsWith('/uploads/')) {
      return `${serverUrl}${imageUrl}`;
    }
    
    // Handle legacy URLs or other formats
    return `${serverUrl}/uploads/processed/${imageUrl}`;
  };
  
  // Function to fix image URLs in generated HTML
  export const fixImageUrlsInHtml = (htmlString: string, serverUrl: string = import.meta.env.VITE_API_URL || 'http://localhost:3001') => {
    return htmlString.replace(
      /src="\/uploads\/processed\/([^"]+)"/g,
      `src="${serverUrl}/uploads/processed/$1"`
    );
  };