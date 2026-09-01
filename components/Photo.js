// A stand-in for real photography. Swap for a real <Image> once Zebra's
// photo shoot (vehicles, Kigali office, staff, airport handover) is ready,
// see the photography brief in the design system notes.
export default function Photo({ height = 160, caption, style = {} }) {
  return (
    <div className="photo" style={{ height, width: "100%", ...style }}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
        <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
        <circle cx="12" cy="13" r="3.5" />
      </svg>
      {caption && (
        <span
          style={{
            position: "absolute",
            bottom: 10,
            left: 10,
            fontSize: 10.5,
            color: "#6b664f",
            background: "rgba(255,255,255,.85)",
            padding: "3px 8px",
          }}
        >
          {caption}
        </span>
      )}
    </div>
  );
}
