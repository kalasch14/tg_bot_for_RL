module.exports =  function(from) {
    let list = []
    
    from.forEach(element => {
        list.push(element.dataValues.chatId)
    });
    
    return list
}