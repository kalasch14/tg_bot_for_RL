module.exports =  function(from) {
    let list = []
    
    from.forEach(element => {
        list.push(element.dataValues.fullName)
    });
    
    return list
}