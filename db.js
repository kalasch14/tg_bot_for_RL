const {Sequelize} = require('sequelize')


module.exports = new Sequelize(
    'rl_bot',
    'user_rl',
    'parlament',
    {
        host: 'localhost',
        port: '5432',
        dialect: 'postgres',
    }
)