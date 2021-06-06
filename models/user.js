const sequelize = require('../db')
const {DataTypes} = require('sequelize')

const User = sequelize.define('user', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        unique: true,
        autoIncrement: true
    },
    chatId: {
        type: DataTypes.STRING,
        unique: true
    },
    task: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
})


module.exports = User