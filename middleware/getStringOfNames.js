module.exports =  function(from) {
    let list = ''
    
    from.forEach(element => {
        list += `\n ${element.dataValues.fullName}`
    });
    
    return list
}