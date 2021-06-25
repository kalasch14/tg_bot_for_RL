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
        type: DataTypes.INTEGER,
        unique: true
    },
    firstName: {
        type: DataTypes.STRING,
    },

    lastName: {
        type: DataTypes.STRING,
    },

    fullName: {
        type: DataTypes.STRING,
    },

    username: {
        type: DataTypes.STRING,
        unique: true,
    },

    task: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },

    dept: {
        type: DataTypes.STRING,
    },

    position: {
        type: DataTypes.STRING,
    },

    checked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
},
{
    tableName: 'users',
    freezeTableName: true
}
)


module.exports = User