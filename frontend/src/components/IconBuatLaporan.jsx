const IconBuatLaporan = ({ className = 'h-6 w-6', ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Sheet of Paper */}
      <path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
        fill="currentColor"
        fillOpacity="0.05"
      />
      <polyline points="14 2 14 8 20 8" />

      {/* Writing Lines on Paper */}
      <line x1="8" y1="12" x2="12" y2="12" strokeWidth="1.5" />
      <line x1="8" y1="16" x2="14" y2="16" strokeWidth="1.5" />

      {/* Pen/Pulpen (Tilted at 45 degrees, writing on the paper) */}
      {/* Pen body outline */}
      <path d="M19.5 2.5l2 2-9 9-2.5.5.5-2.5 9-9z" fill="currentColor" fillOpacity="0.1" />
      {/* Pen cap divider line */}
      <line x1="18.5" y1="5.5" x2="20.5" y2="7.5" />

      {/* Written ink line flowing from the pen tip */}
      <path d="M10 14c-.5.5-1 1-2 1h-2" strokeWidth="1.5" strokeDasharray="1 1.5" />
    </svg>
  );
};

export default IconBuatLaporan;
