'use strict'
const User = use('App/Models/User');
const { validate } = use('Validator');
const Encryption = use('Encryption');
const Token = use('App/Models/Token');

class AuthController {

  async register({request, auth, response}) {


    const rules = {
      email: 'required|email|unique:users,email',
      username: 'required|unique:users,username',
      password: 'required'
    };

    const { email, username, password } = request.only([
      'email',
      'username',
      'password'
    ]);

    const validation = await validate({ email, username, password }, rules);

    if (!validation.fails()) {

      try {
          
        let user = await User.create(request.all())

        //generate token for user;
        let token = await auth.generate(user)

        Object.assign(user, token)

        return response.json(user)

      } catch (err) {
        response.status(401).send({ error: 'Please try again' });
      }

      
    } else {
    
      return response.status(401).send(validation.messages());
    
    }


  }

  async login({request, auth, response}) {

    const rules = {
      email: 'required|email',
      password: 'required'
    };

    const { email, password } = request.only(['email', 'password']);

    const validation = await validate({ email, password }, rules);

    if (!validation.fails()) {

      try {
        
        if (await auth.attempt(email, password)) {
          let user = await User.findBy('email', email)
          let token = await auth.withRefreshToken().generate(user)

          Object.assign(user, token)
          return response.json(user)
        }
        // let user = await auth.attempt(email, password);

      }
      catch (e) {
        console.log(e)
        return response.status(401).send({ error: 'Invalid email or password' });
      }

    } else {
      response.status(401).send(validation.messages());
    }

  }

  async refreshToken({ request, response, auth }) {
    const rules = {
      refresh_token: 'required'
    };

    const { refresh_token } = request.only(['refresh_token']);

    const validation = await validate({ refresh_token }, rules);

    if (!validation.fails()) {
      try {
        return await auth
          .newRefreshToken()
          .generateForRefreshToken(refresh_token);
      } catch (err) {
        return response.status(401).send({ error: 'Invalid refresh token' });
      }
    } else {
      return response.status(401).send(validation.messages());
    }
  }

  async logout({ request, response, auth }) {
    const rules = {
      refresh_token: 'required'
    };

    const { refresh_token } = request.only(['refresh_token']);

    const validation = await validate({ refresh_token }, rules);

    const decrypted = Encryption.decrypt(refresh_token);

    if (!validation.fails()) {
      try {
        const refreshToken = await Token.findBy('token', decrypted);
        if (refreshToken) {
          refreshToken.delete();
          return response.status(200).send({ status: 'ok' });
        } else {
          return response.status(401).send({ error: 'Invalid refresh token' });
        }
      } catch (err) {
        return response.status(401).send({ error: 'something went wrong' });
      }
    } else {
      return response.status(401).send(validation.messages());
    }
  }

}



module.exports = AuthController
