let collisionSystem;
let colors = [];
function setup() {
	createCanvas(800, 600);
	collisionSystem = new CollisionSystem(100, width, height);
    for(let i = 0; i < 100; i++) {
      colors.push(shuffle([1, 0, 0]));
    }
}

function draw() {
	background(0);
	collisionSystem.update();
    let i = 0;
    collisionSystem.particles.forEach((lifespan, c) => {
        let color = colors[i]; 
        fill([color[0] * lifespan , color[1] * lifespan, color[2] * lifespan]);
        c.draw();
        i++;
    });
}

function add(v1, v2) {
	return p5.Vector.add(v1, v2);
}

function sub(v1, v2) {
	return p5.Vector.sub(v1, v2);
}

function checkCollision(circles, tolerant = 5) {
	const copied = circles.map(c => c.body.copy());
	for(let i = 0; i < copied.length; i++) {
		const b1 = circles[i].body;
	  
		for(let j = 0; j < copied.length; j++) {
			if(i != j) {
				const b2 = copied[j];
				const d = circles[i].radius + circles[j].radius;
				if(sub(b1.coordinate, b2.coordinate).mag() <= d) {
					const t = timeBeforeCollision(b1, b2, d, tolerant);
					b1.coordinate = collisionCoordinate(b1, t);
					b2.coordinate = collisionCoordinate(b2, t);
					circles[i].body.collideWith(b2);
					b1.coordinate = coordinateAfterTime(b1, 1 - t);
				}
			}
		}
	}
}

function timeBeforeCollision(b1, b2, d, tolerant) {    
	const preC1 = sub(b1.coordinate, b1.velocity);
	const preC2 = sub(b2.coordinate, b2.velocity);
	const rv = sub(b1.velocity, b2.velocity).mag();
	return (sub(preC1, preC2).mag() + tolerant - d) / rv;
}

function coordinateAfterTime(b, t) {
	return add(b.coordinate, p5.Vector.mult(b.velocity, t));
}
function collisionCoordinate(b, t) {
	const preC = coordinateAfterTime(b, -1)
	return add(preC, p5.Vector.mult(b.velocity, t));
}

function checkEdges(circle) {
	const r = circle.radius;
	const body = circle.body;
	const {x, y} = body.coordinate;
  
	if(x + r > width) {
		const nx = 2 * width - x - 2 * r;
		body.coordinate.x = nx;
		body.velocity.mult([-1, 1]);
	}
  
	if(x - r < 0) {
		const nx = 2 * r - x;
		body.coordinate.x = nx;
		body.velocity.mult([-1, 1]);
	}
  
	if(y + r > height) {
		const ny = 2 * height - y - 2 * r;
		body.coordinate.y = ny;
		body.velocity.mult([1, -1]);
	}
  
	if(y - r < 0) {
		const ny = 2 * r - y;
		body.coordinate.y = ny;
		body.velocity.mult([1, -1]);
	}
}

class Body {
	constructor(coordinate, velocity, mass = 1) {
		this.coordinate = coordinate;
		this.velocity = velocity;
		this.mass = mass;
	    this.collisionListeners = new Set();
	}
  
	applyForce(force) {
		this.velocity.add(force.acceleration);
	}
  
    addCollisionListener(listener) {
	    this.collisionListeners.add(listener);
	}
	
	removeCollisionListener(listener) {
	    this.collisionListeners.delete(listener);
	}
  
	collideWith(body) {
		const d = sub(this.coordinate, body.coordinate);
		const m = body.mass / (this.mass + body.mass);
		this.velocity = sub(
			this.velocity,
			d.mult(
				2 * m / pow(d.mag(), 2) * p5.Vector.dot(
					sub(this.velocity, body.velocity),
					sub(this.coordinate, body.coordinate)
				)
			)
		);
		this.collisionListeners.forEach(listener => listener(this));
	}
  
	update() {
		this.coordinate.add(this.velocity);
	}
  
	copy() {
		return new Body(
			this.coordinate.copy(), 
			this.velocity.copy(),
			this.mass
		);
	}
}

class Shape {
	constructor(body) {
		this.body = body;
	}
	
	update() {
		this.body.update();
	}
}

class Circle extends Shape {
	constructor(body, radius) {
		super(body);
		this.radius = radius;
	}
	
	draw() {
		circle(this.body.coordinate.x, this.body.coordinate.y, 2 * this.radius);
	}
}

class CollisionSystem {
    constructor(number, width, height, lifespan = 255, losing = 10, minR = 5, maxR = 40, maxVx = 5, maxVy = 5) {
		const minX = 1 * maxR;
		const maxX = width - 1 * maxR;
		
		const minY = 1.5 * maxR;
		const maxY = height - 1 * maxR;

        this.particles = new Map();  
      
		while(this.particles.size < number) {
			const r = random(minR, maxR);
			const coordinate = createVector(random(minX, maxX), random(minY, maxY));
			if(Array.from(this.particles.keys()).every(c => p5.Vector.sub(c.body.coordinate, coordinate).mag() > (c.radius + r))) {
			    const body = new Body(
				    coordinate, 
				    createVector(random(-maxVx, maxVx), random(-maxVy, maxVy)),
				    TWO_PI * r
			    );

				const circle = new Circle(body, r);
                this.particles.set(circle, lifespan);
				body.addCollisionListener(evt => this.particles.set(circle, this.particles.get(circle) - losing));
			}
		}
	}

	update() {
	    const circles = Array.from(this.particles.keys());
		circles.forEach(c => c.update());
		checkCollision(circles);
		circles.forEach(c => checkEdges(c));
		this.particles.forEach((lifespan, c) => {
		    if(lifespan <= 0) {
			    this.particles.delete(c);
			}
		});
	}
}

class Force {
   constructor(mass, acceleration) {
	   this.mass = mass;
	   this.acceleration = acceleration;
   }
}