const UserModel = require('../models/user')
const TaskModel = require('../models/task')
const parseDate = require('../middleware/parseDate');

module.exports =  async (bot) => {

    try {
        UserModel.findAll()
        .then(async usersList => {
            for(let i = 0; i < usersList.length; i++){

                let activeTasksList = await TaskModel.findAll({
                    where: {
                        initiator: usersList[i].chatId,
                        isDone: false
                    }
                })
               
                if (activeTasksList.length){
                    await bot.telegram.sendMessage(usersList[i].chatId,`Список отданых заданий, которые находятся на выполнении:`)
                }

                if (activeTasksList.length != 0){
                    for(let k = 0; k < activeTasksList.length; k++){

                        if (!activeTasksList[k].isFailed) {
                            await bot.telegram.sendMessage(usersList[i].chatId,`
                                \n<b>Задание:</b> ${activeTasksList[k].text}
                                \n<b>Приоритет:</b> ${activeTasksList[k].priority}
                                \n<b>Дедлайн:</b> ${parseDate(activeTasksList[k].dateEnd)}
                                \n<b>Исполнитель(и):</b> ${ activeTasksList[k].workersArr.join(', ') }
                                \n<b>Дата Создания:</b> ${parseDate(activeTasksList[k].createdAt)}

                            `, {parse_mode: 'html'})
                        } else {
                            await bot.telegram.sendMessage(usersList[i].chatId,`
                                \n❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️
                                \n<b>Время выполнения задания истекло!</b>
                                \n<b>Задание:</b> ${activeTasksList[k].text}
                                \n<b>Приоритет:</b> ${activeTasksList[k].priority}
                                \n<b>Дедлайн:</b> ${parseDate(activeTasksList[k].dateEnd)} <b>просрочен!</b>
                                \n<b>Исполнитель:</b> ${ activeTasksList[k].workersArr.join(', ') }
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