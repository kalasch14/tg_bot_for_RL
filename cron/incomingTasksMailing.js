const UserModel = require('../models/user')
const TaskModel = require('../models/task')
const parseDate = require('../middleware/parseDate');
const { Op } = require('sequelize');

module.exports =  async (bot) => {

    try {
        UserModel.findAll()
        .then(async usersList => {
            for(let i = 0; i < usersList.length; i++){

                let activeTasksList = await TaskModel.findAll({
                    where: {
                        chatIdArr: {
                            [Op.contains]: [usersList[i].chatId]
                        },
                        isDone: false
                    }
                })
                

                if(activeTasksList.length){
                    await bot.telegram.sendMessage(usersList[i].chatId,`Список полученых заданий, которые находятся на выполнении:`)
                }

                if (activeTasksList.length != 0){
                    for(let k = 0; k < activeTasksList.length; k++){


                        if (!activeTasksList[k].isFailed) {
                            await bot.telegram.sendMessage(usersList[i].chatId,`
                                \n<b>Задание:</b> ${activeTasksList[k].text}
                                \n<b>Приоритет:</b> ${activeTasksList[k].priority}
                                \n<b>Дедлайн:</b> ${parseDate(activeTasksList[k].dateEnd)}
                                \n<b>Инициатор:</b> ${activeTasksList[k].initiatorName}
                                \n<b>Исполнитель(и):</b> ${activeTasksList[k].workersArr.join(', ')}
                                \n<b>Дата Создания:</b> ${parseDate(activeTasksList[k].createdAt)}

                            `, {parse_mode: 'html'})
                        } else {
                            await bot.telegram.sendMessage(usersList[i].chatId,`
                                \n❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️
                                \n<b>Время выполнения задания истекло!</b>
                                \n<b>Задание:</b> ${activeTasksList[k].text}
                                \n<b>Приоритет:</b> ${activeTasksList[k].priority}
                                \n<b>Дедлайн:</b> ${parseDate(activeTasksList[k].dateEnd)} <b>просрочен!</b>
                                \n<b>Инициатор:</b> ${activeTasksList[k].initiatorName}
                                \n<b>Исполнитель(и):</b> ${activeTasksList[k].workersArr.join(', ')}
                                \n<b>Дата Создания:</b> ${parseDate(activeTasksList[k].createdAt)}
                                \n❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️

                            `, {parse_mode: 'html'})
                        }
                    }
                }
            }
        })
    }
    catch (e){
        console.log(e);
    }
}