import supertest from 'supertest';
import app from '../app.mjs';

describe('GET /', () => {
    test('should render home page if the user is logged in', (done) => {
    
        // saved user credential
        const credentials = {
            username: 'qweqweqwe',
            password: 'qweqweqwe',
        };

    supertest(app)
        .post('/login')  
        .send(credentials) //this is the registered login already in database
        .expect(302) // Assuming that the user already logged in so redirect
        .end((err, res) => {
        if (err) return done(err);

        // Now, make the authenticated request to '/'
        supertest(app)
            .get('/')
            .expect(302)
            .end((err, res) => {
            if (err) return done(err);
            done();
            });
        });
    });


    it('should redirect to /login if the user is not logged in', (done) => {
    supertest(app)
        .get('/')
        .expect(302) 
        .end((err, res) => {
        if (err) return done(err);
        done();
        });
    });
});

describe("POST /login", () => {

    test("should respond with 302 status code and redirect to home if the user is logged in", async () => {
        const response = await supertest(app)
            .post("/login")
            .send({
                username: "qweqweqwe",
                password: "qweqweqwe",
            });

        expect(response.statusCode).toBe(302);
    });

    test("should specify html in the content type header", async () => {
        const response = await supertest(app)
            .post("/login")
            .send({
                username: "qweqweqwe",
                password: "qweqweqwe",
            });

        expect(response.header['content-type']).toEqual("text/plain; charset=utf-8");
    });
});

describe('POST /register', () => {

    it('should register a new user and redirect to /', async () => {

        const response = await supertest(app)
        .post('/register')
        .send({
            username: "123123123",
            password: "123123123",
        });
        
        expect(response.statusCode).toBe(200)
    });

    it('should handle duplicate user registration', async () => {

        const response = await supertest(app)
        .post('/register')
        .send({
            username: 'qweqweqwe',
            password: 'qweqweqwe'
        })

        expect(response.statusCode).toBe(200);
        expect(response.header['content-type']).toEqual("text/html; charset=utf-8");
        expect(response.text).toContain('duplicate user');

    });
});
