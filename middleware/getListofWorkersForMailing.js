module.exports =  function(from) {
    let userList = ''

    from.forEach((item, index) => {
        if (from.length == index + 1) {
            userList += `${item}.`
        } else userList += `${item}, `
    })
    
    return userList
}