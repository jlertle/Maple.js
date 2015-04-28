import Component from './models/Component.js';
import Template  from './models/Template.js';
import utility   from './helpers/Utility.js';
import log       from './helpers/Log.js';

(function main($window, $document) {

    "use strict";

    if (typeof System !== 'undefined') {
        System.transpiler = 'babel';
    }

    /**
     * @constant HAS_INITIATED
     * @type {Boolean}
     */
    let HAS_INITIATED = false;

    /**
     * @method isReady
     * @param {String} state
     * @return {Boolean}
     */
    function isReady(state) {
        return (!HAS_INITIATED && (state === 'interactive' || state === 'complete'));
    }

    /**
     * @module Maple
     * @link https://github.com/Wildhoney/Maple.js
     * @author Adam Timberlake
     */
    class Maple {

        /**
         * @constructor
         * @return {void}
         */
        constructor() {
            HAS_INITIATED = true;
            this.findComponents();
        }

        /**
         * @method findComponents
         * @return {void}
         */
        findComponents() {

            [].concat(this.loadLinks()).forEach((promise) => promise.then((templates) => {

                templates.forEach((template) => {

                    // Load all of the prerequisites for the component.
                    Promise.all(this.loadThirdPartyScripts(template)).then(() => {

                        this.resolveScripts(template).forEach((promise) => promise.then((component) => {

                            // Register the custom element using the resolved script.
                            this.registerElement(component);

                        }));

                    });

                });

            }));

        }

        /**
         * @method loadLinks
         * @return {Promise[]}
         */
        loadLinks() {

            let linkElements = this.findLinks();

            return linkElements.map((linkElement) => {

                let href = linkElement.getAttribute('href'),
                    name = utility.extractName(href),
                    path = utility.extractPath(href);

                log('Component', name, '#8B864E');

                return new Promise((resolve) => {

                    /**
                     * @method findTemplates
                     * @return {void}
                     */
                    var findTemplates = () => {

                        let templates = [];

                        this.findTemplates(linkElement.import).forEach((templateElement) => {

                            // Instantiate our component with the name, path, and the associated element.
                            let template = new Template({ name: name, path: path, element: templateElement });
                            templates.push(template);

                        });

                        resolve(templates);

                    };

                    if (linkElement.import) {
                        return void findTemplates();
                    }

                    linkElement.addEventListener('load', findTemplates);

                });

            });

        }

        /**
         * @method loadThirdPartyScripts
         * @param {Template} template
         * @return {Promise[]}
         */
        loadThirdPartyScripts(template) {

            return template.thirdPartyScripts().map((script) => new Promise((resolve) => {

                let scriptElement = $document.createElement('script');
                scriptElement.setAttribute('type', 'text/javascript');
                scriptElement.setAttribute('src', script.getAttribute('src'));

                scriptElement.addEventListener('load', () => {
                    resolve(scriptElement);
                });

                $document.head.appendChild(scriptElement);

            }));

        }

        /**
         * @method resolveScripts
         * @param {Template} template
         * @return {Promise[]}
         */
        resolveScripts(template) {

            return template.componentScripts().map((scriptElement) => new Promise((resolve) => {

                let scriptPath = template.resolveScriptPath(scriptElement.getAttribute('src'));

                System.import(scriptPath).then((moduleImport) => {

                    // Resolve each script contained within the template element.
                    resolve(new Component({ script: moduleImport.default, template: template }));

                });

            }));

        }

        /**
         * Responsible for creating the custom element using $document.registerElement, and then appending
         * the associated React.js component.
         *
         * @method registerElement
         * @param {Component} component
         * @return {void}
         */
        registerElement(component) {

            let name = component.elementName();

            if (name.split('-').length <= 1) {
                log('Invalid Tag', `${name}`, '#DB7093');
                return;
            }

            $document.registerElement(name, {
                prototype: component.customElement()
            });

        }

        /**
         * @method findLinks
         * @return {Array}
         */
        findLinks() {
            return utility.toArray($document.querySelectorAll(utility.selector.links));
        }

        /**
         * @method findTemplates
         * @param {HTMLDocument} [documentRoot=$document]
         * @return {Array}
         */
        findTemplates(documentRoot = $document) {
            return utility.toArray(documentRoot.querySelectorAll(utility.selector.templates));
        }

    }

    // Support for the "async" attribute on the Maple script element.
    if (isReady($document.readyState)) {
        new Maple();
    }

    // No documents, no person.
    $document.addEventListener('DOMContentLoaded', () => new Maple());

})(window, document);