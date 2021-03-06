const _ = require('lodash');
const fs = require('fs');
const xlsx = require('xlsx');

function extract(xlsxFileName) {
  return new Promise((resolve) => {
    var workbook = xlsx.readFile(xlsxFileName);
    var first_sheet_name = workbook.SheetNames[0];
    var worksheet = workbook.Sheets[first_sheet_name];

    resolve(worksheet);
  });
};

function transform(worksheet) {
  return new Promise((resolve) => {
    // Output questions json
    var questions = [];

    // id of the next question input
    var id = 0;

    // Start row number
    var START_ROW = 3;
    var END_ROW = 2702;

    // Columns in XLSX file
    var SECTION = 'B';
    var LIBELLE = 'D';
    var TRAJECTOIRE = 'E';
    var QUESTION = 'F';
    var TYPE = 'G';

    var REPONSE_LIBELLE = ['J','K','L','M','N','O'];
    var REPONSE_CODE_VALEUR = 'I';

    const isSection = row => !!worksheet[SECTION + row];

    const makeSection = (row, id) => ({
      id: id,
      Section: worksheet[SECTION + row].v,
      Libelle: worksheet[LIBELLE + row].v,
      Trajectoire: _.capitalize(worksheet[TRAJECTOIRE + row].v),
      Question: worksheet[QUESTION + row].v,
      Type: worksheet[TYPE + row].v,
      Reponses: []
    });

    const LEVEL0 = 0;
    const LEVEL1 = 1;
    const LEVEL2 = 2;
    const LEVEL3 = 3;
    const LEVEL4 = 4;
    const LEVEL5 = 5;

    const isResponseLevel = (row, level) => !!worksheet[REPONSE_LIBELLE[level] + row];

    const getId = (worksheet, row) => {
      const codeValeur = worksheet[REPONSE_CODE_VALEUR + row]
      if (codeValeur) {
        return codeValeur.v.replace(/\./g, '_');
      } else {
        return `${row}_id`;
      }
    };

    const makeReponse = (worksheet, row, level) => ({
      id: getId(worksheet, row),
      CodeValeur: worksheet[REPONSE_CODE_VALEUR + row] ? worksheet[REPONSE_CODE_VALEUR + row].v : 'pas de code valeur',
      Libelle: worksheet[REPONSE_LIBELLE[level] + row].v
    });

    const processResponseLevel = (row, level) => {
      reponses[level] = makeReponse(worksheet, row, level);

      if (!reponses[level - 1].Reponses) {
        reponses[level - 1].Reponses = [];
      }

      reponses[level - 1].Reponses.push(reponses[level]);
    };

    // Current section and reponse working on
    var section = {};
    var reponses = [];

    // Process until current row is empty
    for (var row = START_ROW ; row <= END_ROW ; row++) {

      if (isSection(row)) {
        // If current row as a section (not empty), make new section

        // Save the current section in questions
        if (row > START_ROW) {
          questions.push(section);
          reponses = [];
          id++;
        }

        // Create a new section
        section = makeSection(row, id);

        // Create a new reponse
        reponses[0] = makeReponse(worksheet, row, 0, []);
        section.Reponses.push(reponses[0]);
      } else {
        // Is not a Section but is ether a Reponse or SubReponse

        if (isResponseLevel(row, LEVEL0)) {
          // This row is a Reponse level 0
          reponses[LEVEL0] = makeReponse(worksheet, row, LEVEL0, []);
          section.Reponses.push(reponses[0]);
        } else if (isResponseLevel(row, LEVEL1)) {
          // This row is a Reponse level 1
          processResponseLevel(row, LEVEL1);
        } else if (isResponseLevel(row, LEVEL2)) {
          // This row is a Reponse level 2
          processResponseLevel(row, LEVEL2);
        } else if (isResponseLevel(row, LEVEL3)) {
          // This row is a Reponse level 3
          processResponseLevel(row, LEVEL3);
        } else if (isResponseLevel(row, LEVEL4)) {
          // This row is a Reponse level 4
          processResponseLevel(row, LEVEL4);
        } else if (isResponseLevel(row, LEVEL5)) {
          // This row is a Reponse level 5
          processResponseLevel(row, LEVEL5);
        }

      }
    }

    questions.push(section);
    resolve(questions);
  });
};

function load(json, output_file) {
  // stringify: parameter '2' is for pretty output
  fs.writeFileSync(output_file, JSON.stringify(json, null, 2));
}

module.exports = {
  extract,
  transform,
  load
}
