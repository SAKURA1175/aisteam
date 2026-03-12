import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          padding: "44px",
          background:
            "radial-gradient(circle at 18% 24%, rgba(255, 214, 188, 0.92), transparent 30%), radial-gradient(circle at 82% 18%, rgba(191, 234, 210, 0.88), transparent 28%), linear-gradient(155deg, #fffaf4 0%, #fff4e7 45%, #f7fff8 100%)",
          color: "#5b3a22"
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            borderRadius: "40px",
            border: "2px solid rgba(255, 174, 131, 0.34)",
            padding: "42px",
            background: "rgba(255,255,255,0.78)",
            boxShadow: "0 28px 80px rgba(91, 58, 34, 0.10)"
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "112px",
                  height: "112px",
                  borderRadius: "34px",
                  background: "linear-gradient(145deg, #ff9b5d 0%, #ffd6b8 100%)",
                  color: "#fffaf4",
                  fontSize: "54px",
                  fontWeight: 800
                }}
              >
                蛋
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ fontSize: "66px", fontWeight: 800, letterSpacing: "-0.05em" }}>蛋壳伴学</div>
                <div style={{ fontSize: "22px", color: "rgba(91,58,34,0.72)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                  Eggshell Companion
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ fontSize: "68px", fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1.06, maxWidth: "900px" }}>
                会记得孩子、会引用资料、会延续学习节奏的 AI 陪伴伙伴。
              </div>
              <div style={{ fontSize: "28px", lineHeight: 1.55, color: "rgba(91,58,34,0.76)", maxWidth: "930px" }}>
                真实多老师接口、家庭资料库、长期记忆和流式聊天工作台，统一接入儿童向的伴学体验。
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
