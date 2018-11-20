$.getJSON('./assets/games.json', function(json) {
    let width = 512;
    let height = 288;
    let chosen = [];

    // Because Javascript is 'good'.

    for (var i = 1; i <= 3; i++) {
        do {
            var random = Math.floor(Math.random() * json.length);
            console.log(random);
        } while (chosen.includes(random));

        chosen.push(random);

        let game = json[random];

        $("#game" + i + " > img").attr('src', game.largeImageUrl);
        $("#game" + i + " > img").attr('width', width);
        $("#game" + i + " > img").attr('height', height);

        $("#game" + i + " > div > h3").text(game.name);
    }
});