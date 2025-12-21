export function Loading() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[200px] w-full">
      <div className="relative w-24 h-24 flex items-center justify-center">
        <div className="absolute inset-0 bg-primary-100 rounded-full animate-ping opacity-75"></div>
        <div className="relative z-10 bg-white p-4 rounded-full shadow-sm border border-primary-100">
           <img 
             src="https://cdn.prod.website-files.com/685945d76d7a305336412a93/686bcac753076d6555ec57b9_Logo%20Kameleoon%20White.svg" 
             alt="Loading..." 
             className="w-12 h-auto invert filter brightness-0 hue-rotate-[150deg] saturate-[0.5]" 
           />
        </div>
      </div>
      <div className="mt-4 text-primary-800 font-medium animate-pulse">Loading...</div>
    </div>
  );
}

interface LoadingSpinnerProps {
  size?: 'default' | 'large';
}

export function LoadingSpinner({ size = 'default' }: LoadingSpinnerProps) {
  const containerSize = size === 'large' ? 'w-32 h-32' : 'w-16 h-16';
  const logoSize = size === 'large' ? 'w-16' : 'w-8';
  const textSize = size === 'large' ? 'text-lg' : 'text-sm';

  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <div className={`relative ${containerSize} flex items-center justify-center`}>
        <div className="absolute inset-0 bg-primary-100 rounded-full animate-ping opacity-75"></div>
        <div className="relative z-10 bg-white p-3 rounded-full shadow-sm border border-primary-100 flex items-center justify-center w-full h-full">
           <img 
             src="https://cdn.prod.website-files.com/685945d76d7a305336412a93/686bcac753076d6555ec57b9_Logo%20Kameleoon%20White.svg" 
             alt="Loading..." 
             className={`${logoSize} h-auto invert filter brightness-0 hue-rotate-[150deg] saturate-[0.5]`} 
           />
        </div>
      </div>
      {size === 'large' && (
        <div className={`mt-6 ${textSize} text-primary-800 font-medium animate-pulse`}>Loading Kameleoon Data...</div>
      )}
    </div>
  );
}
