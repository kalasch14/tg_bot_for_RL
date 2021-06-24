const {
    Scenes: { BaseScene }
} = require("telegraf");

const UserModel = require('../models/user')
const { Keyboard, Key } = require("telegram-keyboard");
const { Sequelize } = require("sequelize");


class LoginScenesGenerator {

    LoginGen(){

        const login = new BaseScene('login')

        login.enter(async (ctx) => {
            await ctx.reply('Введите пароль!')
        })

        login.on('text', async (ctx) => {
            if(ctx.message.text == 'parlament'){
    
                await ctx.scene.enter('dept')

            } else {
                await ctx.reply('Пароль не верный!')
                await ctx.scene.reenter()
            }
        })

        return login

    }

    HelloGen(){
        const hello = new BaseScene('hello')

        hello.enter(async (ctx)=> {
            await ctx.reply('👋')
            const keyboard = await Keyboard.make([
                ['Входящие задания', 'Исходящие задания'],
                ['Поставить задание', 'Выполненные задания'],
            ])

            //ctx.scene.enter('task')

            await ctx.reply(`
            \nЧто умеет этот бот:
            \nПоставить задание - описываете задание, выбираете ответственного, ставите приоритет, указываете дедлайн. Ответственному человеку приходит уведомление о создании задания.
            \nВходящие задания - здадания, где Вы указаны ответственным лицом.
            \nИсходящие задания - задания, которые Вы создали.
            \nВыполненные задания - задания, выполненные вами
            
            
            `, keyboard.reply())


            await ctx.scene.leave()


        })

        return hello
    }


    DepartGen(){
        const dept = new BaseScene('dept')
        
        dept.enter(async (ctx) => {
            await ctx.reply('Есть, теперь выберите департамент!(можно выбрать только один)', deptKeyboard)
        })

        dept.on('callback_query', async (ctx) => {

            ctx.session.dataStorage.userDept = ctx.callbackQuery.data

            await ctx.scene.enter('pos')

        })
        return dept
    }


    PositionGen(){
        const pos = new BaseScene('pos')

        pos.enter(async (ctx) => {
            if (ctx.callbackQuery.data == 'Дирекция') {

                ctx.reply(`Выберите должность, ваш департамент ${ctx.session.dataStorage.userDept}`, positionKeyboard)
                
            } else if (ctx.session.dataStorage.userDept == 'Финансовый'){

                ctx.reply(`Выберите должность, ваш департамент ${ctx.session.dataStorage.userDept}`, positionKeyboard)

            } else if (ctx.callbackQuery.data == 'Технический'){

                ctx.reply(`Выберите должность, ваш департамент ${ctx.session.dataStorage.userDept}`, positionKeyboard)

            } else if (ctx.callbackQuery.data == 'Бухгалтерия'){

                ctx.reply(`Выберите должность, ваш департамент ${ctx.session.dataStorage.userDept}`, positionKeyboard)

            } else if (ctx.callbackQuery.data == 'Коммерческий'){

                ctx.reply(`Выберите должность, ваш департамент ${ctx.session.dataStorage.userDept}`, positionKeyboard)

            }
        })

        pos.on('callback_query', async ctx => {

            ctx.session.dataStorage.userPos = ctx.callbackQuery.data

            let name = ''

            if(ctx.chat.last_name == undefined){
                name = ctx.chat.first_name
            } else name = `${ctx.chat.last_name} ${ctx.chat.first_name}`
        

            await UserModel.create({

                chatId: ctx.chat.id,
                firstName: ctx.chat.first_name,
                lastName: ctx.chat.last_name,
                fullName: name,
                username: ctx.chat.username,
                dept: ctx.session.dataStorage.userDept,
                position: ctx.session.dataStorage.userPos

            })

            await ctx.scene.enter('hello')

        })

        return pos
    }


}


const deptKeyboard = Keyboard.make([
    [Key.callback('Дирекция','Дирекция')],
    [Key.callback('Финансовый','Финансовый')],
    [Key.callback('Технический','Технический')],
    [Key.callback('Бухгалтерия','Бухгалтерия')],
    [Key.callback('Коммерческий','Коммерческий')]
  ]).inline()

const positionKeyboard = Keyboard.make([
    [Key.callback('Директор','Директор')],
    [Key.callback('ЗамДир','ЗамДир')],
    [Key.callback('Работник','Работник')],
]).inline()


module.exports = LoginScenesGenerator