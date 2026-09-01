import Photo from "./Photo";

// Renders a real uploaded vehicle photo (see components/admin/VehiclePhotoManager.js)
// when one exists at this index, otherwise falls back to the grey
// placeholder. Never substitutes a stock or invented image (Rule 5).
export default function VehiclePhoto({ photos = [], index = 0, height = 160, caption, style = {} }) {
  const photo = photos[index];
  if (!photo) {
    return <Photo height={height} caption={caption} style={style} />;
  }
  return (
    <div className="photo" style={{ height, width: "100%", overflow: "hidden", padding: 0, ...style }}>
      <img
        src={photo.url}
        alt={photo.altText || ""}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
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
