import { ImageResponse } from "next/og";

/** The app icon: a dark "Б" on lime, drawn at any size. */
export function renderAppIcon(size: number, rounded: boolean) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#a3e635",
          color: "#1a2e05",
          fontSize: size * 0.62,
          fontWeight: 900,
          borderRadius: rounded ? size * 0.22 : 0,
        }}
      >
        Б
      </div>
    ),
    { width: size, height: size }
  );
}
