const sequelize = require('../db')
const {DataTypes} = require('sequelize')

const Task = sequelize.define('task', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        unique: true,
        autoIncrement: true
    },

    initiator: {
        type: DataTypes.INTEGER
    },
    priority: {
        type: DataTypes.STRING,
    },
    text: {
        type: DataTypes.STRING,
    },
    chatId: {
        type: DataTypes.STRING,
        unique: true
    },
    worker: {
        type: DataTypes.STRING
    },
    isDone: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    dateEnd : {
        type: DataTypes.STRING
    },
    
},
{
    tableName: 'task',
    schema: 'public',
    freezeTableName: true
}
)


module.exports = Task