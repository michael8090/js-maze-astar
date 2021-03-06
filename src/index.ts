function createCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width * devicePixelRatio;
  canvas.height = height * devicePixelRatio;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  return canvas;
}

interface MazeUnit {
  x: number;
  y: number;
  w: number;
  h: number;
  i: number;
  j: number;
  id: string;
  isBlock: boolean;
}

type Maze = MazeUnit[][];

function generateMaze(
  width: number,
  height: number,
  unitSize: number,
  block: number
) {
  const maze: Maze = [];
  const xUnitCount = Math.floor(width / unitSize);
  const yUnitCount = Math.floor(height / unitSize);
  for (let i = 0; i < xUnitCount; i++) {
    maze[i] = [];
    const row = [];
    maze[i] = row;
    for (let j = 0; j < yUnitCount; j++) {
      row[j] = {
        i,
        j,
        id: i + ":" + j,
        x: i * unitSize,
        y: j * unitSize,
        w: unitSize,
        h: unitSize,
        isBlock: Math.random() < block
      };
    }
  }
  return maze;
}

function drawMaze(canvas: HTMLCanvasElement, maze: Maze) {
  const ctx = canvas.getContext("2d");
  maze.forEach(row => {
    row.forEach(unit => {
      const fillColor = unit.isBlock ? "#46484c" : "#ffffff";
      ctx.fillStyle = fillColor;
      ctx.fillRect(unit.x, unit.y, unit.w, unit.h);
      ctx.strokeStyle = "#bebebe";
      ctx.strokeRect(unit.x, unit.y, unit.w, unit.h);
    });
  });
}

function getStartPoint(maze: Maze) {
  const i = Math.floor(Math.random() * maze[0].length);
  const j = Math.floor(Math.random() * maze.length);
  return maze[i][j];
}

function drawUnit(ctx: CanvasRenderingContext2D, unit: MazeUnit, fillStyle) {
  ctx.fillStyle = fillStyle;
  ctx.fillRect(unit.x, unit.y, unit.w, unit.h);
}

function drawStartPoint(ctx: CanvasRenderingContext2D, startPoint: MazeUnit) {
  drawUnit(ctx, startPoint, "#0000ff");
}

function mapGet(map: MyWeakMap, obj: any) {
  if (map.has(obj)) {
    return map.get(obj);
  }
  return Infinity;
}

class MyWeakMap {
  protected static instanceCount = 0;
  private id = "weakmap" + MyWeakMap.instanceCount++;
  set(obj: object, value: any) {
    obj[this.id] = value;
  }
  get(obj: Object) {
    return obj[this.id];
  }
  has(obj: Object) {
    return obj[this.id] !== undefined;
  }
}

class MySet<T> {
  private record = {};
  size = 0;
  constructor(private getId: (t: T) => string, arr?: T[]) {
    if (arr) {
      const { record } = this;
      arr.forEach((a, i) => (record[getId(a)] = a));
      this.size = Object.keys(record).length;
    }
  }
  has(item: T) {
    return !!this.get(item);
  }
  get(item: T) {
    return this.record[this.getId(item)];
  }
  add(item: T) {
    if (!this.has(item)) {
      this.size++;
    }
    this.record[this.getId(item)] = item;
  }
  delete(item: T) {
    if (this.has(item)) {
      this.size--;
    }
    delete this.record[this.getId(item)];
  }
  values() {
    const { record } = this;
    return Object.keys(record).map(k => record[k]);
  }
}

function buildPath(
  from: {
    [key: string]: MazeUnit;
  },
  unit: MazeUnit
) {
  const path: MazeUnit[] = [unit];
  while (unit) {
    const parent = from[unit.id];
    if (parent) {
      path.push(parent);
    }
    unit = parent;
  }
  return path;
}

function cost(a: MazeUnit, b: MazeUnit) {
  // chebyshev distance
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function getPath(
  maze: Maze,
  startPoint: MazeUnit,
  targetPoint: MazeUnit
): MazeUnit[] {
  // a* here

  const closedSet = new MySet<MazeUnit>(unit => unit.id);
  const openSet = new MySet<MazeUnit>(unit => unit.id, [startPoint]);
  const from: {
    [key: string]: MazeUnit;
  } = {};
  const gScore = new MyWeakMap();
  const fScore = new MyWeakMap();

  gScore.set(startPoint, 0);
  fScore.set(startPoint, cost(startPoint, targetPoint));
  while (openSet.size !== 0) {
    const openUnits = openSet.values();
    let current = openUnits[0];
    for (let i = 0, l = openUnits.length; i < l; i++) {
      const u = openUnits[i];
      if (fScore.get(u) < fScore.get(current)) {
        current = u;
      }
    }
    if (current.i === targetPoint.i && current.j === targetPoint.j) {
      return buildPath(from, current);
    }
    openSet.delete(current);
    closedSet.add(current);
    const { i, j } = current;
    function getMazeUnit(ix: number, iy: number) {
      const row = maze[ix];
      if (row) {
        return row[iy];
      }
    }
    const neighbors: MazeUnit[] = [
      [i - 1, j],
      [i, j - 1],
      [i, j + 1],
      [i + 1, j]
    ]
      .map(p => getMazeUnit(p[0], p[1]))
      .filter(u => !!u && !u.isBlock);
    neighbors.forEach(neighbor => {
      if (closedSet.has(neighbor)) {
        return;
      }
      openSet.add(neighbor);
      // here we use the same cost method, normally it should be a different `getDistance`
      const tentasiveGScore = mapGet(gScore, current) + cost(current, neighbor);
      if (tentasiveGScore >= mapGet(gScore, neighbor)) {
        return;
      }
      from[neighbor.id] = current;
      gScore.set(neighbor, tentasiveGScore);
      fScore.set(neighbor, gScore.get(neighbor) + cost(neighbor, targetPoint));
    });
  }
  return [];
}

function start() {
  const { body } = document;
  const { offsetHeight, offsetWidth } = body;
  const width = devicePixelRatio * offsetWidth;
  const height = devicePixelRatio * offsetHeight;
  const mazeCanvas = createCanvas(offsetWidth, offsetHeight);
  document.body.appendChild(mazeCanvas);

  const unitSize = parseInt(location.search.slice(1)) || 10;
  const maze = generateMaze(width, height, unitSize, 0.3);
  drawMaze(mazeCanvas, maze);

  const playerCanvas = createCanvas(offsetWidth, offsetHeight);
  playerCanvas.style.position = "absolute";
  playerCanvas.style.left = "0";
  playerCanvas.style.top = "0";
  document.body.appendChild(playerCanvas);
  const startPoint = getStartPoint(maze);
  const ctx = playerCanvas.getContext("2d");
  drawStartPoint(ctx, startPoint);

  let mouseEvent: MouseEvent;

  playerCanvas.onmousemove = e => (mouseEvent = e);

  const rowLength = maze[0].length;
  const colLength = maze.length;

  function loop() {
    if (mouseEvent) {
      ctx.clearRect(0, 0, width, height);
      drawStartPoint(ctx, startPoint);

      let i = Math.floor(mouseEvent.pageX * devicePixelRatio / unitSize);
      let j = Math.floor(mouseEvent.pageY * devicePixelRatio / unitSize);

      if (i > colLength - 1) {
        i = colLength - 1;
      }

      if (i < 0) {
        i = 0;
      }

      if (j > rowLength - 1) {
        j = rowLength - 1;
      }

      if (j < 0) {
        j = 0;
      }

      const targetPoint = maze[i][j];
      drawUnit(ctx, targetPoint, "#00ff00");

      if (!targetPoint.isBlock) {
        const path = getPath(maze, startPoint, targetPoint);
        path.shift();
        path.pop();
        path.forEach((unit, i) => drawUnit(ctx, unit, "#00ff00"));
      }

      mouseEvent = undefined;
    }
    requestAnimationFrame(loop);
  }

  loop();
}

start();
