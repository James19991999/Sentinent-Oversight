import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Sentinel Oversight — Enterprise Cyber Defense";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "#031427",
          color: "#d3e4fe",
          fontSize: 64,
          fontWeight: 700,
        }}
      >
        <div style={{ color: "#7bd0ff", fontSize: 24, letterSpacing: 4, marginBottom: 16 }}>ENTERPRISE CYBER DEFENSE</div>
        <div>SENTINEL OVERSIGHT</div>
      </div>
    ),
    { ...size }
  );
}
