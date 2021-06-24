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
                                \nЗадание: ${activeTasksList[k].text}
                                \nПриоритет: ${activeTasksList[k].priority}
                                \nДедлайн: ${parseDate(activeTasksList[k].dateEnd)}
                                \nИсполнитель(и): ${ activeTasksList[k].workersArr.join(', ') }
                                \nДата Создания: ${parseDate(activeTasksList[k].createdAt)}

                            `)
                        } else {
                            await bot.telegram.sendMessage(usersList[i].chatId,`
                                \n❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️
                                \nВремя выполнения задания истекло!
                                \nЗадание: ${activeTasksList[k].text}
                                \nПриоритет: ${activeTasksList[k].priority}
                                \nДедлайн: ${parseDate(activeTasksList[k].dateEnd)} просрочен!
                                \nИсполнитель: ${ activeTasksList[k].workersArr.join(', ') }
                                \nДата Создания: ${parseDate(activeTasksList[k].createdAt)}
                                \n❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️

                            `)
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