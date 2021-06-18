const TaskModel = require('../models/task')

module.exports =  async () => {

    try {
        TaskModel.findAll({
            where: {
                isDone: false
            }
        })
        .then(async taskList => {
            for(let l = 0; l < taskList.length; l++){
                let dateEnd = Date.parse(taskList[l].dateEnd)
                let dateNow = Date.parse(new Date)

                if(dateNow < dateEnd){
                    taskList[l].isFailed = false
                    await taskList[l].save()
                }
            }
        })

    } catch(e){
        console.log(e);
    }
}