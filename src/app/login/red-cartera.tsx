/**
 * Red decorativa de la cartera: nodos y vínculos. Solo las entidades reales del producto
 * llevan etiqueta (Clientes, Oportunidades, Pedidos, Casos); no muestra cifras ni nombres.
 */

type Nodo = { x: number; y: number; r: number; ent?: string; etiqueta?: string; activo?: boolean };

const NODOS: Nodo[] = [
  { x: 170, y: 300, r: 9, ent: "clientes", etiqueta: "Clientes" },
  { x: 330, y: 230, r: 9, ent: "oportunidades", etiqueta: "Oportunidades" },
  { x: 470, y: 330, r: 9, ent: "pedidos", etiqueta: "Pedidos" },
  { x: 300, y: 395, r: 9, ent: "casos", etiqueta: "Casos" },
  { x: 90, y: 220, r: 4 },
  { x: 230, y: 165, r: 4 },
  { x: 420, y: 150, r: 4 },
  { x: 565, y: 245, r: 4 },
  { x: 555, y: 425, r: 4 },
  { x: 400, y: 460, r: 4 },
  { x: 195, y: 450, r: 4 },
  { x: 70, y: 370, r: 4 },
  { x: 480, y: 232, r: 4 },
  { x: 340, y: 312, r: 5, activo: true },
];

// Pares de índices de NODOS.
const ENLACES: Array<[number, number]> = [
  [0, 4], [0, 5], [0, 11], [0, 10], [0, 3], [0, 13],
  [1, 5], [1, 6], [1, 12], [1, 13],
  [2, 12], [2, 7], [2, 8], [2, 9],
  [3, 9], [3, 10], [3, 13],
  [4, 5], [6, 12], [7, 8],
];

// Único camino por el que corre el pulso ambiente.
const CAMINO_PULSO = "M70 370 L170 300 L340 312 L330 230 L480 232 L470 330";

export function RedCartera({
  etiquetas = true,
  recorte = false,
  className,
}: {
  etiquetas?: boolean;
  recorte?: boolean;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 640 560"
      preserveAspectRatio={recorte ? "xMidYMid slice" : "xMidYMid meet"}
      className={`rc-dibuja ${className ?? ""}`}
    >
      {ENLACES.map(([a, b], i) => (
        <path
          key={`${a}-${b}`}
          className="rc-enlace"
          pathLength={1}
          style={{ ["--i" as string]: i }}
          d={`M${NODOS[a].x} ${NODOS[a].y} L${NODOS[b].x} ${NODOS[b].y}`}
        />
      ))}
      <path className="rc-pulso" pathLength={1} d={CAMINO_PULSO} />
      {NODOS.map((n, i) => (
        <g key={i}>
          <circle
            className={n.activo ? "rc-nodo rc-nodo-activo" : "rc-nodo"}
            data-ent={n.ent}
            cx={n.x}
            cy={n.y}
            r={n.r}
          />
          {etiquetas && n.etiqueta ? (
            <text className="rc-etiqueta" data-ent={n.ent} x={n.x + 16} y={n.y + 4}>
              {n.etiqueta}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}
