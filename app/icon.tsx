import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#031427",
          borderRadius: 6,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M12 2L4 5.5V11C4 16.5 7.4 21.2 12 22C16.6 21.2 20 16.5 20 11V5.5L12 2Z"
            fill="#7bd0ff"
          />
          <path d="M12 6.5L8 8.3V11C8 14 9.7 16.7 12 17.3V6.5Z" fill="#031427" fillOpacity="0.55" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
