const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

const EPSILON = 0.0001;
function approxEqu(a, b) {
	return Math.abs(a - b) <= EPSILON;
}

let lastTime;

class Vector {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
	
	clone() {
		return new Vector(this.x, this.y);
	}
	
	add(x, y) {
		if (typeof(x) === "number" && typeof(y) === "number") {
			this.x += x;
			this.y += y;
		} else if (typeof(x) === "number") {
			this.x += x;
			this.y += x;
		} else if (typeof(x) === "object") {
			this.x += x.x !== undefined ? x.x : 0;
			this.y += x.y !== undefined ? x.y : 0;
		}
		return this;
	}
	
	subtract(x, y) {
		if (typeof(x) === "number" && typeof(y) === "number") {
			this.x -= x;
			this.y -= y;
		} else if (typeof(x) === "number") {
			this.x -= x;
			this.y -= x;
		} else if (typeof(x) === "object") {
			this.x -= x.x !== undefined ? x.x : 0;
			this.y -= x.y !== undefined ? x.y : 0;
		}
		return this;
	}
	
	multiplyBy(x, y) {
		if (typeof(x) === "object") {
			this.x *= x.x !== undefined ? x.x : 0;
			this.y *= x.y !== undefined ? x.y : 0;
		} else if (typeof(x) === "number" && typeof(y) === "number") {
			this.x *= x;
			this.y *= y;
		} else if (typeof(x) === "number") {
			this.x *= x;
			this.y *= x;
		}
		return this;
	}
	
	divideBy(x, y) {
		if (typeof(x) === "number" && typeof(y) === "number") {
			this.x /= x;
			this.y /= y;
		} else if (typeof(x) === "number") {
			this.x /= x;
			this.y /= x;
		} else if (typeof(x) === "object") {
			this.x /= x.x !== undefined ? x.x : 0;
			this.y /= x.y !== undefined ? x.y : 0;
		}
		return this;
	}
	
	plus(x, y) {
		let v = this.clone();
		return v.add(x, y);
	}
	
	minus(x, y) {
		let v = this.clone();
		return v.subtract(x, y);
	}
	
	times(x, y) {
		let v = this.clone();
		return v.multiplyBy(x, y);
	}
	
	dividedBy(x, y) {
		let v = this.clone();
		return v.divideBy(x, y);
	}
	
	magnitudeSqr() {
		return this.x * this.x + this.y * this.y;
	}
	
	magnitude() {
		return Math.sqrt(this.magnitudeSqr());
	}
	
	normalize() {
		if (approxEqu(this.x, 0) && approxEqu(this.y, 0)) {
			return new Vector(0, 0);
		}
		return this.divideBy(this.magnitude());
	}
	
	normalizeR() {
		this.normalize();
		const vx = this.x;
		const vy = this.y;
		this.x = -vy;
		this.y = vx;
		return this;
	}
	
	static dot(v1, v2) {
        return v1.x * v2.x + v1.y * v2.y;
    }
	
	static cross(v1, v2) {
        return v1.x * v2.y - v1.y * v2.x;
    }
}

class Matrix {
    constructor(rows, cols) {
        this.rows = rows;
        this.cols = cols;
        this.data = [];

        for (let i = 0; i<this.rows; i++){
            this.data[i] = [];
            for (let j=0; j<this.cols; j++){
                this.data[i][j] = 0;
            }
        }
    }

    multiplyVec(v) {
		const vx = v.x;
		const vy = v.y;
        v.x = this.data[0][0] * vx + this.data[0][1] * vy;
        v.y = this.data[1][0] * vx + this.data[1][1] * vy;
        return v;
    }
	
	setToAngle(angle) {
		this.data[0][0] = Math.cos(angle);
		this.data[0][1] = -Math.sin(angle);
		this.data[1][0] = Math.sin(angle);
		this.data[1][1] = Math.cos(angle);
		return this;
	}
}

class Circle {
    constructor({pos, radius, mass, drag, restitution, gravitates}={}) {
        this.pos = pos !== undefined ? pos : new Vector(0, 0);
		this.lastPos = this.pos.clone();
		
		this.acc = new Vector(0, 0);
		
        this.radius = radius !== undefined ? radius : 1;
        this.mass = mass !== undefined ? mass : 1;
		
        if (this.mass === 0) {
            this.invMass = 0;
        } else {
            this.invMass = 1 / this.mass;
        }
		
		this.drag = drag !== undefined ? drag : 0.001;
        
		this.restitution = restitution !== undefined ? restitution : 0;
        
		this.vel = new Vector(0, 0);
		
		this.gravitates = gravitates !== undefined ? gravitates : true;
	}

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, 2 * Math.PI);
//        ctx.stroke();
		ctx.fill();
        ctx.closePath();
    }
	
	updatePosition(dt) {
		if (this.invMass == 0) {
			return;
		}
		
	//	this.vel = this.pos.minus(this.lastPos).divideBy(1 + this.drag);
	//	this.lastPos = this.pos.clone();
		
		let delta = this.getVelocity().dividedBy(1 + this.drag).add(this.acc.times(dt * dt));
		this.lastPos = this.pos.clone();
		this.pos.add(delta);
		
		this.acc = new Vector(0, 0);
	}
	
	addVelocity(v)
	{
		this.lastPos.subtract(v);
	}
	
	getVelocity(v)
	{
		return this.pos.minus(this.lastPos);
	}
	
	accelerate(acc) {
		this.acc.add(acc);
	}
}

class Link {
	constructor(a, b, targetDist) {
		this.a = a;
		this.b = b;
		this.targetDist = targetDist;
		this.normal = new Vector(0, 0);
	}
	
	apply() {
		let axis = this.a.pos.minus(this.b.pos);
		let dist = axis.magnitude();
		this.normal = axis.dividedBy(dist);
		let delta = (this.targetDist - dist) * 0.8;
		this.a.pos.add(this.normal.times(delta * (this.a.invMass / (this.a.invMass + this.b.invMass))));
		this.b.pos.subtract(this.normal.times(delta * (this.b.invMass / (this.a.invMass + this.b.invMass))));
		return dist;
	}
}

class Grid {
	constructor(width, height, cellWidth, gameObjects) {
		this.width = width;
        this.height = height;
		this.cellWidth = cellWidth;
        this.data = [];
		this.gameObjects = gameObjects;

        for (let i = 0; i<this.width; i++){
            this.data[i] = [];
            for (let j=0; j<this.height; j++){
                this.data[i][j] = [];
            }
        }
	}
	
	clear() {
		for (let i = 0; i<this.width; i++) {
            for (let j=0; j<this.height; j++) {
                this.data[i][j].length = 0;
            }
        }
	}
	
	update() {
		this.clear();
		for (let i = 0; i < this.gameObjects.length; i++) {
			let coords = this.getCoordsOf(this.gameObjects[i]);
			this.data[coords[0]][coords[1]].push(i);
		}
	}
	
	getIndices(x, y) {
		return this.data[x][y];
	}
	
	get(x, y) {
		let indices = this.getIndices(x, y);
		let objs = [];
		for (let i = 0; i < indices.length; i++) {
			objs.push(this.gameObjects[indices[i]]);
		}
		
		return objs;
	}
	
	getCoordsOf(a) {
		return [Math.floor(a.pos.x / this.cellWidth), Math.floor(a.pos.y / this.cellWidth)];
	}
	
	resolveAllCollisions() {
		for (let i = 1; i < this.width-1; ++i) {
			for (let j = 1; j < this.height-1; ++j) {
				let thisCell = this.getIndices(i, j);
				for (let di = -1; di <= 1; ++di) {
					for (let dj =-1; dj <= 1; ++dj) {
						let otherCell = this.getIndices(i+di, j+dj);
						this.resolveCellsCollisions(thisCell, otherCell);
					}
				}
			}
		}
	}
	
	resolveCellsCollisions(cellA, cellB) {
		for (let i = 0; i < cellA.length; i++) {
			for (let j = 0; j < cellB.length; j++) {
				if (cellA[i] == cellB[j]) {
					continue;
				}
				
				this.resolveCollision(this.gameObjects[cellA[i]], this.gameObjects[cellB[j]]);
			}
		}
	}
	
	resolveCollision(a, b) {
		if (a === b) {
			return null;
		}
		
		if (a.invMass == 0 && b.invMass == 0) {
			return null;
		}
		
		let difference = a.pos.minus(b.pos);
		let distance = difference.magnitudeSqr();
		
		if (distance > (a.radius + b.radius) * (a.radius + b.radius)) {
			return null;
		}
		distance = Math.sqrt(distance);
		
		let depth = (a.radius + b.radius - distance);
		let normal;
		if (distance > 0) {
			normal = difference.divideBy(distance);
		} else {
			normal = new Vector(0, 0);
		}
		
		let delta = depth * 0.8;
		
		a.pos.add(normal.times(delta * (a.invMass / (a.invMass + b.invMass))));
		b.pos.subtract(normal.times(delta * (b.invMass / (a.invMass + b.invMass))));
		
/*		let deltaV = a.getVelocity().minus(b.getVelocity());
		a.addVelocity(deltaV.times(0.0025));
		b.addVelocity(deltaV.times(0.0025));*/
	}
}

class Scene {
	constructor(canvas) {
		this.gameObjects = [];
		this.linkages = [];
		this.grid = new Grid(80, 60, 8, this.gameObjects);
		this.canvas = canvas;
		this.ctx = canvas.getContext("2d");
		
		this.objRadius = 3;
		
		this.gravity = new Vector(0, 1000);
	}
	
	update(dt) {
		ctx.clearRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
		ctx.fillStyle = "rgb(0, 0, 0)";
		ctx.fillRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
		this.updatePhysics(dt);
		this.updateCanvas();
	}
	
	applyGravity() {
		this.gameObjects.forEach((obj) => {
			if (obj.gravitates) {
				obj.accelerate(this.gravity);
			}
		});
	}
	
	applyConstraint() {
		let center = new Vector(320, 240);
		const radius = 200;
		this.gameObjects.forEach((obj, o) => {
			let toObj = obj.pos.minus(center);
			
			let dist = toObj.magnitude();
			if (dist > radius - this.objRadius) {
				let normal = toObj.dividedBy(dist);
				obj.pos = center.plus(normal.times(radius - this.objRadius));
			}
			
		});
	}
	
	updateCanvas() {
		this.ctx.fillStyle = "rgb(0, 255, 0)";
		this.ctx.font = "10px Arial";
		for (let i = 0; i < this.gameObjects.length; i++) {
			this.gameObjects[i].draw(this.ctx);
//			this.ctx.fillText(i, this.gameObjects[i].pos.x, this.gameObjects[i].pos.y);
		}
		
		this.ctx.strokeStyle = "rgb(0, 0, 0, 0.5)";
		for (let i = 0; i < this.linkages.length*0; i++) {
			ctx.beginPath();
			ctx.moveTo(this.linkages[i].a.pos.x, this.linkages[i].a.pos.y);
			ctx.lineTo(this.linkages[i].b.pos.x, this.linkages[i].b.pos.y);
			ctx.stroke();
		}
		
		this.ctx.fillStyle = "rgb(255, 255, 255)";
		
		this.ctx.font = "18px Arial"
		this.ctx.fillText(Math.round(1000/(performance.now()-lastTime)), 18, 32);
		lastTime = performance.now();
	}
	
	updatePhysics(dt) {
		let subSteps = 8;
		let subDt = dt / subSteps;
		for (let i = subSteps; i > 0; i--) {
			this.applyGravity();
			this.applyConstraint();
			
			this.grid.update(this.gameObjects);
			
			this.grid.resolveAllCollisions();
			
			this.updatePositions(subDt);
		}
	}
	
	updatePositions(dt) {
		this.gameObjects.forEach((obj) => {
			obj.updatePosition(dt);
		});
		this.linkages.forEach((link, l) => {
			if (link.apply() > link.targetDist * 100) {
				this.linkages.splice(l, 1);
			}

		});
	}
}

const scene = new Scene(canvas);

for (let j = 0; j < 1; j++) {
	scene.gameObjects.push(new Circle({pos: new Vector(120+6, 237+j*12), radius: 3, mass: 0, gravitates: false}));
	scene.gameObjects.push(new Circle({pos: new Vector(120+6, 243+j*12), radius: 3, mass: 0, gravitates: false}));
	for (let i = 1; i < 64; i++) {
		scene.gameObjects.push(new Circle({pos: new Vector(120+6+i*6, 237+j*12), radius: 3, mass: 1}));
		scene.gameObjects.push(new Circle({pos: new Vector(120+6+i*6, 243+j*12), radius: 3, mass: 1}));
		scene.linkages.push(new Link(scene.gameObjects[scene.gameObjects.length - 2], scene.gameObjects[scene.gameObjects.length - 3], 6 * Math.SQRT2));
		scene.linkages.push(new Link(scene.gameObjects[scene.gameObjects.length - 1], scene.gameObjects[scene.gameObjects.length - 4], 6 * Math.SQRT2));
		scene.linkages.push(new Link(scene.gameObjects[scene.gameObjects.length - 1], scene.gameObjects[scene.gameObjects.length - 3], 6));
		scene.linkages.push(new Link(scene.gameObjects[scene.gameObjects.length - 2], scene.gameObjects[scene.gameObjects.length - 4], 6));
		scene.linkages.push(new Link(scene.gameObjects[scene.gameObjects.length - 1], scene.gameObjects[scene.gameObjects.length - 2], 6));
	}
	scene.gameObjects.push(new Circle({pos: new Vector(520-6, 237+j*12), radius: 3, mass: 0, gravitates: false}));
	scene.gameObjects.push(new Circle({pos: new Vector(520-6, 243+j*12), radius: 3, mass: 0, gravitates: false}));
	scene.linkages.push(new Link(scene.gameObjects[scene.gameObjects.length - 2], scene.gameObjects[scene.gameObjects.length - 3], 6 * Math.SQRT2));
	scene.linkages.push(new Link(scene.gameObjects[scene.gameObjects.length - 1], scene.gameObjects[scene.gameObjects.length - 4], 6 * Math.SQRT2));
	scene.linkages.push(new Link(scene.gameObjects[scene.gameObjects.length - 2], scene.gameObjects[scene.gameObjects.length - 4], 6));
	scene.linkages.push(new Link(scene.gameObjects[scene.gameObjects.length - 1], scene.gameObjects[scene.gameObjects.length - 3], 6));
}
/*
for (let i = 0; i < 400; i++) {
	scene.gameObjects.push(new Circle({pos: new Vector(320+i%20*6-10*6, 100+Math.floor(i/20) * 6), radius: 3, mass: 1}));
}*/

function mainLoop(timestamp) {
	scene.update(1/60);
    requestAnimationFrame(mainLoop);
	scene.gameObjects.push(new Circle({pos: new Vector(320, 100), radius: 3, mass: 1}));
}
requestAnimationFrame(mainLoop);
//scene.update(1);