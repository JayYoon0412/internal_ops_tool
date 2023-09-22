import * as handlebars from 'handlebars';
import * as fs from 'fs';

export function registerPartials() {
    const mainHeaderSource = fs.readFileSync('views/mainHeader.hbs', 'utf-8');
    handlebars.registerPartial('mainHeader', mainHeaderSource);
}