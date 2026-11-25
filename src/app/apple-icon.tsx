import { renderAppIcon } from "@/lib/app-icon";

// iOS rounds the corners itself, so this one is square.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return renderAppIcon(size.width, false);
}
