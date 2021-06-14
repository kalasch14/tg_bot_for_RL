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
    initiatorName: {
        type: DataTypes.STRING
    },
    priority: {
        type: DataTypes.STRING,
    },
    text: {
        type: DataTypes.STRING,
    },
    chatId: {
        type: DataTypes.INTEGER,
    },
    worker: {
        type: DataTypes.STRING
    },
    isDone: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    isFailed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    dateEnd : {
        type: DataTypes.DATE
    },
    
},
{
    freezeTableName: true,
    tableName: "tasks"
}
)
 

module.exports = Task