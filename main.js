function setup() {
    createCanvas(windowWidth, windowHeight);
    for(const tool of tools)
        tool.img = tool.img();
}
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

const cam = {
    rx: 0, ry: 0, x: 0, y: 0, rzoom: 3, zoom: 3,
    scaleToCamera(scalar) {
        return scalar * this.zoom * this.zoom;
    },
    worldToCamera(x, y) {
        return [width / 2 + (x - this.x) * this.zoom * this.zoom, height / 2 + (y - this.y) * this.zoom * this.zoom];
    },
    cameraToWorld(x, y) {
        return [(x - width / 2) / this.zoom / this.zoom + this.x, (y - height / 2) / this.zoom / this.zoom + this.y];
    },
    rcameraToWorld(x, y) {
        return [(x - width / 2) / this.rzoom / this.rzoom + this.x, (y - height / 2) / this.rzoom / this.rzoom + this.y];
    }
};

class Point {
    constructor(x, y, locked = false) {
        this.x = x;
        this.y = y;
        this.exists = true;
        this.locked = locked;
        this.col = locked ? [255, 0, 0] : [0, 100, 255];
    }
    childOf(c) {
        return this.locked === c;
    }
    resolve(c) {
        deleteConstruct(this);
    }
    update() {
        if(isSelected(this) && mouseIsPressed && mouseButton === LEFT) {
            const n = cam.cameraToWorld(mouseX, mouseY), p = cam.cameraToWorld(pmouseX, pmouseY);
            if(this.locked) {
                [this.x, this.y] = n;
            }
            else {
                this.x += n[0] - p[0];
                this.y += n[1] - p[1];
            }
        }
        if(this.locked)
            [this.x, this.y] = this.locked.closest(this.x, this.y);
    }
    display() {
        const p = cam.worldToCamera(this.x, this.y);
        if(hovering === this || isSelected(this)) {
            stroke(...this.col, isSelected(this) ? 100 : 50);
            strokeWeight(30);
            point(...p);
        }
        stroke(...this.col);
        strokeWeight(20);
        point(...p);
    }
    hovering() {
        const m = cam.worldToCamera(this.x, this.y);
        if(sq(mouseX - m[0]) + sq(mouseY - m[1]) < 10 * 10)
            return true;
        return false;
    }
}

class Line {
    constructor(point1, point2) {
        this.point1 = point1;
        this.point2 = point2;
    }
    childOf(c) {
        return (this.point1 === c) || (this.point2 === c);
    }
    resolve(c) {
        deleteConstruct(this);
    }
    update() {
        if(!this.point1.exists || !this.point2.exists) this.exists = false;
        else this.exists = true;
    }
    display() {
        const p1 = cam.worldToCamera(this.point1.x, this.point1.y),
              p2 = cam.worldToCamera(this.point2.x, this.point2.y);
        if(hovering === this || isSelected(this)) {
            stroke(0, selected ? 100 : 50);
            strokeWeight(5);
            if(Math.abs(p1[0] - p2[0]) < 0.1)
                line(p1[0], 0, p1[0], height);
            else {
                const m = (p2[1] - p1[1]) / (p2[0] - p1[0]),
                    b = p1[1] - m * p1[0];
                line(0, b, width, width * m + b);
            }
        }
        if(this.exists) stroke(0);
        else stroke(255, 0, 0, 50);
        strokeWeight(2);
        if(Math.abs(p1[0] - p2[0]) < 0.1)
            line(p1[0], 0, p1[0], height);
        else {
            const m = (p2[1] - p1[1]) / (p2[0] - p1[0]),
                b = p1[1] - m * p1[0];
            line(0, b, width, width * m + b);
        }
    }
    closest(x, y) {
        const dx = this.point2.x - this.point1.x, dy = this.point2.y - this.point1.y;
        const d = (dx * (this.point1.y - y) - dy * (this.point1.x - x)) / (dx * dx + dy * dy);
        return [x - dy * d, y + dx * d];
    }
    hovering() {
        const p1 = cam.worldToCamera(this.point1.x, this.point1.y),
              p2 = cam.worldToCamera(this.point2.x, this.point2.y);
        return Math.abs((p2[0] - p1[0]) * (p1[1] - mouseY) - (p1[0] - mouseX) * (p2[1] - p1[1])) / Math.sqrt(sq(p2[0] - p1[0]) + sq(p2[1] - p1[1])) < 10;
    }
}

class Circle {
    constructor(center, outer) {
        this.center = center;
        this.outer = outer;
    }
    childOf(c) {
        return (this.center === c) || (this.outer === c);
    }
    resolve(c) {
        deleteConstruct(this);
    }
    update() {
        if(!this.center.exists || !this.outer.exists) this.exists = false;
        else this.exists = true;
    }
    display() {
        const p1 = cam.worldToCamera(this.center.x, this.center.y),
              p2 = cam.worldToCamera(this.outer.x, this.outer.y);
        this.radius = Math.sqrt(sq(this.outer.x - this.center.x) + sq(this.outer.y - this.center.y));
        const r = cam.scaleToCamera(this.radius);
        noFill();
        if(hovering === this || isSelected(this)) {
            stroke(0, selected ? 100 : 50);
            strokeWeight(5);
            ellipse(p1[0], p1[1], r * 2, r * 2);
        }
        if(this.exists) stroke(0);
        else stroke(255, 0, 0, 50);
        strokeWeight(2);
        ellipse(p1[0], p1[1], r * 2, r * 2);
    }
    closest(x, y) {
        const d = this.radius / Math.sqrt(sq(x - this.center.x) + sq(y - this.center.y));
        return [this.center.x + (x - this.center.x) * d, this.center.y + (y - this.center.y) * d];
    }
    hovering() {
        const p1 = cam.worldToCamera(this.center.x, this.center.y);
        const d = Math.sqrt(sq(mouseX - p1[0]) + sq(mouseY - p1[1]));
        const r = cam.scaleToCamera(this.radius);
        return d > r - 5 && d < r + 5;
    }
}

class Intersection {
    constructor(construct1, construct2, n = 0) {
        if(construct2 instanceof Line) {
            this.construct1 = construct2;
            this.construct2 = construct1;
        }
        else {
            this.construct1 = construct1;
            this.construct2 = construct2;
        }
        this.n = n;
    }
    childOf(c) {
        return (this.construct1 === c) || (this.construct2 === c);
    }
    resolve(c) {
        deleteConstruct(this);
    }
    update() {
        this.exists = false;
        if(this.construct1 instanceof Line) {
            if(this.construct2 instanceof Line) {
                const line1 = this.construct1, line2 = this.construct2;
                const x1 = line1.point1.x, y1 = line1.point1.y,
                      x2 = line1.point2.x, y2 = line1.point2.y;
                const x3 = line2.point1.x, y3 = line2.point1.y,
                      x4 = line2.point2.x, y4 = line2.point2.y;
                const xa = x1 - x2, xb = x3 - x4,
                      ya = y1 - y2, yb = y3 - y4;
                const A = x1 * y2 - y1 * x2, B = x3 * y4 - y3 * x4;
                let d = xa * yb - ya * xb;
                if(d !== 0) {
                    this.exists = true;
                    d = 1 / d;
                }
                this.x = (A * xb - B * xa) * d;
                this.y = (A * yb - B * ya) * d;
            }
            else {
                const line = this.construct1, circle = this.construct2;
                const x1 = line.point1.x - circle.center.x, y1 = line.point1.y - circle.center.y,
                      x2 = line.point2.x - circle.center.x, y2 = line.point2.y - circle.center.y;
                const dx = x2 - x1,
                      dy = y2 - y1;
                const dr = dx * dx + dy * dy;
                const D = x1 * y2 - x2 * y1;
                let disc = circle.radius * circle.radius * dr - D * D;
                if(disc >= 0) {
                    this.exists = true;
                    disc = Math.sqrt(disc);
                }
                else disc = 0;
                if(this.n) {
                    this.x = (D * dy + dx * disc) / dr + circle.center.x;
                    this.y = (-D * dx + dy * disc) / dr + circle.center.y;
                }
                else {
                    this.x = (D * dy - dx * disc) / dr + circle.center.x;
                    this.y = (-D * dx - dy * disc) / dr + circle.center.y;
                }
            }
        }
        else {
            const circle1 = this.construct1, circle2 = this.construct2;
            const r1 = circle1.radius, r2 = circle2.radius;
            const d = sq(circle2.center.x - circle1.center.x) + sq(circle2.center.y - circle1.center.y);
            let id = 0;
            if(d > 0) {
                this.exists = true;
                id = 1 / d;
            }
            const c = d - r1 * r1 + r2 * r2;
            const r = c * id / 2;
            const rx = circle2.center.x + r * (circle1.center.x - circle2.center.x), ry = circle2.center.y + r * (circle1.center.y - circle2.center.y);
            let a = r2 * r2 - c * c * id / 4;
            if(a >= 0)
                a = Math.sqrt(a);
            else {
                this.exists = false;
                a = 0;
            }
            let bx = circle2.center.y - circle1.center.y, by = circle1.center.x - circle2.center.x;
            id = Math.sqrt(id);
            bx *= id;
            by *= id;
            if(this.n) {
                this.x = rx + bx * a;
                this.y = ry + by * a;
            }
            else {
                this.x = rx - bx * a;
                this.y = ry - by * a;
            }
        }
        if(!this.construct1.exists || !this.construct2.exists) this.exists = false;
    }
    display() {
        const p = cam.worldToCamera(this.x, this.y);
        if(hovering === this || isSelected(this)) {
            stroke(0, 200, 50, isSelected(this) ? 100 : 50);
            strokeWeight(30);
            point(...p);
        }
        if(this.exists) stroke(0, 200, 50, 255);
        else stroke(255, 0, 0, 50);
        strokeWeight(20);
        point(...p);
    }
    hovering() {
        const m = cam.worldToCamera(this.x, this.y);
        if((mouseX - m[0]) * (mouseX - m[0]) + (mouseY - m[1]) * (mouseY - m[1]) < 10 * 10)
            return true;
        return false;
    }
}

let constructs = [new Point(-10, 0), new Point(10, 0)];
constructs.push(new Circle(constructs[0], constructs[1]));
constructs.push(new Circle(constructs[1], constructs[0]));
constructs.push(new Intersection(constructs[2], constructs[3], 0));
constructs.push(new Intersection(constructs[2], constructs[3], 1));
constructs.push(new Line(constructs[4], constructs[5]));
constructs.push(new Line(constructs[0], constructs[1]));

let selected = [], hovering = 0;
function isSelected(obj) {
    return selected.indexOf(obj) !== -1;
}

let tools = [
    {
        name: "Point",
        img() {
            background(255);
            stroke(0, 100, 255);
            strokeWeight(20);
            point(toolHeight / 2, toolHeight / 2);
            return get(0, 0, toolHeight, toolHeight);
        }
    },
    {
        name: "Line",
        img() {
            background(255);
            stroke(0);
            strokeWeight(2);
            line(0, toolHeight * 0.2, toolHeight, toolHeight * 0.8);
            stroke(0, 100, 255);
            strokeWeight(10);
            point(toolHeight * 0.3, toolHeight * (0.2 + 0.6 * 0.3));
            point(toolHeight * 0.7, toolHeight * (0.2 + 0.6 * 0.7));
            return get(0, 0, toolHeight, toolHeight);
        },
        process: [
            { action: "tool", tool: 0 },
            { action: "tool", tool: 0 },
            { action: "create", construct: Line, args: [0, 1] },
            { action: "end" }
        ]
    },
    {
        name: "Circle",
        img() {
            background(255);
            stroke(0);
            strokeWeight(2);
            ellipse(toolHeight / 2, toolHeight / 2, toolHeight * 0.8, toolHeight * 0.8);
            stroke(0, 100, 255);
            strokeWeight(10);
            point(toolHeight / 2, toolHeight / 2);
            point(toolHeight * 0.9, toolHeight / 2);
            return get(0, 0, toolHeight, toolHeight);
        },
        process: [
            { action: "tool", tool: 0 },
            { action: "tool", tool: 0 },
            { action: "create", construct: Circle, args: [0, 1] },
            { action: "end" }
        ]
    },
    {
        name: "Intersect",
        img() {
            background(255);
            stroke(0);
            strokeWeight(2);
            line(0, toolHeight * 0.2, toolHeight, toolHeight * 0.8);
            line(0, toolHeight * 0.8, toolHeight, toolHeight * 0.2);
            stroke(0, 100, 255);
            strokeWeight(10);
            point(toolHeight / 2, toolHeight / 2);
            return get(0, 0, toolHeight, toolHeight);
        },
        process: [
            { action: "pick", possible: [Line, Circle] },
            { action: "pick", possible: [Line, Circle] },
            { action: "function", function() {
                const first = constructStack[constructStack.length - 2], last = constructStack[constructStack.length - 1];
                const p1 = new Intersection(first, last, 0);
                constructs.push(p1);
                constructStack.push(p1);
                if(first instanceof Circle || last instanceof Circle) {
                    const p2 = new Intersection(first, last, 1);
                    constructs.push(p2);
                    constructStack.push(p2);
                }
                return true;
            } },
            { action: "end" }
        ]
    },
];
const toolbarHeight = 100, toolHeight = toolbarHeight - 40;
let toolbarScroll = 0;
let toolStack = [], constructStack = [];
function toolbar() {
    noStroke();
    fill(150);
    rect(0, 0, width, toolbarHeight);
    push();
    translate(-toolbarScroll, 0);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(12);
    let over = false;
    for(let i = 0; i < tools.length; i += 1) {
        noFill();
        const x = 5 + i * (toolHeight + 10), y = 5;
        if(toolStack.length && toolStack[0][0] === i)
            fill(0, 75);
        if(mouseX + toolbarScroll > x && mouseX + toolbarScroll < x + toolHeight + 10 && mouseY > y && mouseY < toolbarHeight - 10) {
            over = true;
            if(!toolStack.length || toolStack[0][0] !== i) fill(0, 50);
            if(mouseIsPressed) fill(0, 100);
            if(released) {
                released = false;
                toolStack = toolStack[0]?.[0] === i ? [] : [[i, 0]];
            }
        }
        rect(x, y, toolHeight + 10, toolbarHeight - 10 - y);
        image(tools[i].img, x + 5, y + 5, toolHeight, toolHeight);
        fill(0);
        text(tools[i].name, x + toolHeight / 2 + 5, (y + 5 + toolHeight + toolbarHeight - 10) / 2);
    }
    if(!over && mouseY < toolbarHeight && mouseIsPressed) toolStack = [];
    pop();
    if(mouseY < toolbarHeight && mouseIsPressed)
        toolbarScroll += (pmouseX - mouseX);
    toolbarScroll = constrain(toolbarScroll, -width + toolHeight + 20, (tools.length - 1) * (toolHeight + 10));
}

// super inefficient
function deleteConstruct(c) {
    constructs.splice(constructs.indexOf(c), 1);
    let go = false;
    while(!go) {
        go = true;
        for(const c2 of constructs) {
            if(c2.childOf(c)) {
                go = false;
                c2.resolve(c);
                break;
            }
        }
    }
}

let keys = {}, pkeys = {};
function keyPressed() {
    keys[key.toString().toLowerCase()] = true;
    pkeys[key.toString().toLowerCase()] = true;
    if(key === "Delete") {
        if(selected.length) {
            for(const c of selected)
                deleteConstruct(c);
            selected.length = 0;
        }
    }
}
function keyReleased() {
    keys[key.toString().toLowerCase()] = false;
}
let pressed = false, released = false;
function mousePressed() {
    if(!hovering) selected = [];
    else if(keys.shift) {
        if(!isSelected(hovering)) selected.push(hovering);
    }
    else selected = [hovering];
    pressed = true;
}
function mouseReleased() {
    released = true;
}
function mouseWheel(e) {
    const p = cam.rcameraToWorld(mouseX, mouseY);
    cam.rzoom -= e.delta * 0.001;
    cam.rzoom = constrain(cam.rzoom, 1, 5);
    const n = cam.rcameraToWorld(mouseX, mouseY);
    cam.rx += p[0] - n[0];
    cam.ry += p[1] - n[1];
}

function useTools() {
    if(toolStack.length)
        background(230);
    hovering = 0;
    if(mouseY > toolbarHeight) {
        if(toolStack.length) {
            const last = toolStack[toolStack.length - 2], current = toolStack[toolStack.length - 1];
            if(current[0] === 0) {
                for(const c of constructs)
                    if((c instanceof Line || c instanceof Circle) && c.hovering()) hovering = c;
                for(const c of constructs)
                    if((c instanceof Intersection) && c.hovering()) hovering = c;
                for(const c of constructs)
                    if((c instanceof Point) && c.hovering()) hovering = c;
                if(hovering) {
                    if((hovering instanceof Point || hovering instanceof Intersection)) {
                        if(pressed) {
                            pressed = false;
                            toolStack.splice(toolStack.length - 1, 1);
                            constructStack.push(hovering);
                            if(toolStack.length)
                                last[1] += 1;
                        }
                    }
                    else {
                        const closest = hovering.closest(...cam.cameraToWorld(mouseX, mouseY));
                        strokeWeight(20);
                        stroke(255, 0, 0, 50);
                        point(...cam.worldToCamera(...closest));
                        if(pressed) {
                            pressed = false;
                            toolStack.splice(toolStack.length - 1, 1);
                            const p = new Point(...closest, hovering);
                            constructStack.push(p);
                            constructs.push(p);
                            if(toolStack.length)
                                last[1] += 1;
                        }
                    }
                }
                else {
                    stroke(0, 100, 255, 50);
                    strokeWeight(20);
                    point(mouseX, mouseY);
                    if(pressed) {
                        pressed = false;
                        const p = new Point(...cam.cameraToWorld(mouseX, mouseY));
                        constructs.push(p);
                        toolStack.splice(toolStack.length - 1, 1);
                        constructStack.push(p);
                        if(toolStack.length)
                            last[1] += 1;
                    }
                }
            }
            else {
                const tool = current[0],
                      step = current[1];
                switch(tools[tool].process[step].action) {
                    case "tool": toolStack.push([tools[tool].process[step].tool, 0]);
                    break;
                    case "create":
                        const args = tools[tool].process[step].args.map(i => constructStack[i]);
                        const l = new tools[tool].process[step].construct(...args);
                        constructs.push(l);
                        constructStack.push(l);
                        current[1] += 1;
                    break;
                    case "pick":
                        const points = tools[tool].process[step].possible.includes(Point),
                              intersections = tools[tool].process[step].possible.includes(Intersection),
                              lines = tools[tool].process[step].possible.includes(Line),
                              circles = tools[tool].process[step].possible.includes(Circle);
                        for(const c of constructs)
                            if(((c instanceof Line && lines) || (c instanceof Circle && circles)) && c.hovering()) hovering = c;
                        for(const c of constructs)
                            if(((c instanceof Intersection && intersections)) && c.hovering()) hovering = c;
                        for(const c of constructs)
                            if(((c instanceof Point && points)) && c.hovering()) hovering = c;
                        if(hovering && pressed) {
                            pressed = false;
                            constructStack.push(hovering);
                            current[1] += 1;
                        }
                    break;
                    case "function":
                        if(tools[tool].process[step].function()) {
                            toolStack.splice(toolStack.length - 1, 1);
                            current[1] += 1;
                        }
                    break;
                    case "end":
                        toolStack.splice(toolStack.length - 1, 1);
                        if(toolStack.length)
                            last[1] += 1;
                    break;
                }
            }
        }
        else {
            for(const c of constructs)
                if((c instanceof Line || c instanceof Circle) && c.hovering()) hovering = c;
            for(const c of constructs)
                if((c instanceof Intersection) && c.hovering()) hovering = c;
            for(const c of constructs)
                if((c instanceof Point) && c.hovering()) hovering = c;
            constructStack.length = 0;
        }
    }
}
function update() {
    for(const c of constructs)
        c.update();
}
function display() {
    for(const c of constructs)
        if(c instanceof Line || c instanceof Circle) c.display();
    for(const c of constructs)
        if(c instanceof Intersection) c.display();
    for(const c of constructs)
        if(c instanceof Point) c.display();
}
function controls() {
    cam.zoom += (cam.rzoom - cam.zoom) * 0.5;
    cam.x += (cam.rx - cam.x) * 0.5;
    cam.y += (cam.ry - cam.y) * 0.5;
    if(mouseY > toolbarHeight && mouseIsPressed && (mouseButton === RIGHT || (mouseButton === LEFT && !selected.length))) {
        const n = cam.cameraToWorld(mouseX, mouseY), p = cam.cameraToWorld(pmouseX, pmouseY);
        cam.rx += p[0] - n[0];
        cam.ry += p[1] - n[1];
    }

}

function draw() {
    background(255);

    useTools();
    update();
    display();
    toolbar();
    controls();

    pkeys = {};
    pressed = released = false;
}
