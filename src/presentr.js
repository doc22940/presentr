import * as _ from './lib/utils';

function Presentr(opt = {}) {

    const that = {

        // Assign default options
        options: _.applyDeep({

            // Query selectors
            slides: '.presentr .slides > section',
            fragments: '.frag',

            // CSS Group prefix
            groupPrefix: 'g-',

            // CSS classes
            previousSlideClass: 'previous-slide',
            nextSlideClass: 'next-slide',
            currentSlideClass: 'current-slide',
            activeFragmentClass: 'active-grag',
            currentFragmentClass: 'current-frag',

            // Start index
            slideIndex: 0,

            // Keyboard shortcuts
            shortcuts: {
                nextSlide: ['d', 'D'],
                previousSlide: ['a', 'A'],

                firstSlide: ['y', 'Y'],
                lastSlide: ['x', 'X'],

                nextFragment: ['ArrowRight', 'ArrowDown'],
                previousFragment: ['ArrowLeft', 'ArrowUp']
            },

            // Event listeners
            onInit: () => 0,
            onSlide: () => 0,
            onFragment: () => 0,
            onAction: () => 0

        }, opt),

        _init() {

            // Initialization state
            that._initActive = true;
            const queryAll = (query, base) => Array.from(base.querySelectorAll(query));

            // Slides stuff
            that._slideIndex = null;
            that._slides = queryAll(that.options.slides, document);

            // Fragments stuff
            that._fragmentIndex = 0;

            // Resolve groups
            const {groupPrefix} = that.options;
            that._fragments = that._slides.map(s => {
                const groups = {};
                const frags = [];
                const fg = queryAll(that.options.fragments, s);

                // Cluster elements which are grouped
                for (let i = 0, f, n = fg.length; f = fg[i], i < n; i++) {
                    const group = Array.from(f.classList).find(v => v.startsWith(groupPrefix));

                    if (group) {

                        if (group in groups) {
                            frags[groups[group]].push(f);
                        } else {
                            groups[group] = i;
                            frags.push([f]);
                        }

                    } else {
                        frags.push([f]);
                    }
                }

                return frags;
            });

            // Bind shortcuts
            window.addEventListener('keyup', that._keyboardInput);

            // Trigger
            that.jumpSlide(that.options.slideIndex);
            that._initActive = false;

            // Fire init event
            that._fireEvent('onInit');
        },

        // Helper function to fire events
        _fireEvent(name) {
            const fn = that.options[name];

            // Check if presentr is currently in initialization mode and cb is a function
            if (!that._initActive && typeof fn === 'function') {

                // Pre-calculations cause slides and fragments starts at one, not zero.
                const presentr = that;

                // State slide stuff
                const slideIndex = that._slideIndex;
                const slides = that._slides.length - 1;
                const slidePercent = slides === 0 ? 0 : slideIndex / slides;

                // State fragments stuff
                const fragmentIndex = that._fragmentIndex;
                const fragments = that._fragments[slideIndex].length;
                const fragmentPercent = fragments === 0 ? 0 : fragmentIndex / fragments;

                const state = {presentr, slideIndex, slides, slidePercent, fragmentIndex, fragments, fragmentPercent};

                // Call event-listener
                fn(state);

                // Call action listener
                that.options.onAction(state);
            }
        },

        _keyboardInput(e) {
            const match = cv => cv === e.code || cv === e.key;
            const {shortcuts} = that.options;
            const fns = ['nextSlide', 'previousSlide', 'lastSlide', 'firstSlide', 'nextFragment', 'previousFragment']; // Available shortcuts

            // Find corresponding shortcut action
            const target = Object.keys(shortcuts).find(v => {
                const code = shortcuts[v];
                return Array.isArray(code) ? code.find(match) : match(code);
            });

            // Check shortcut was found and execute function
            target && fns.includes(target) && that[target]();
        },

        firstSlide: () => that.jumpSlide(0),
        lastSlide: () => that.jumpSlide(that._slides.length - 1),
        nextSlide: () => that.jumpSlide(that._slideIndex + 1),
        previousSlide: () => that.jumpSlide(that._slideIndex - 1),
        jumpSlide(index) {
            const {_slides, _fragments, options} = this;

            // Validate
            if (index < 0 || index >= _slides.length) {
                return false;
            }

            for (let i = 0; i < _slides.length; i++) {
                const classl = _slides[i].classList;

                if (i === index) {
                    classl.add(options.currentSlideClass);
                    classl.remove(options.previousSlideClass);
                    classl.remove(options.nextSlideClass);
                } else if (i < index) {
                    classl.remove(options.currentSlideClass);
                    classl.add(options.previousSlideClass);
                } else if (i > index) {
                    classl.remove(options.currentSlideClass);
                    classl.add(options.nextSlideClass);
                }
            }

            // Apply index
            that._slideIndex = index;

            // Update fragment index
            that._fragmentIndex = _fragments[index].reduce((ac, groups, ci) => {
                const containsActiveFragment = groups.find(el => el.classList.contains(options.activeFragmentClass));
                return containsActiveFragment ? ci + 1 : ac;
            }, 0);

            // Fire event
            that._fireEvent('onSlide');
            return true;
        },

        nextFragment: () => that.jumpFragment(that._fragmentIndex + 1),
        previousFragment: () => that.jumpFragment(that._fragmentIndex - 1),
        jumpFragment(index) {
            const fragments = that._fragments[that._slideIndex];

            // Jump to next / previous slide if no further fragments
            if (index < 0) {
                return that.previousSlide();
            } else if (index > fragments.length) {
                return that.nextSlide();
            }

            // Apply class for previous and current fragment(s)
            that._fragmentIndex = index;
            for (let i = 0, group, n = fragments.length; i < n && (group = fragments[i]); i++) {
                const afcAction = i < index ? 'add' : 'remove';
                const cfcAction = i === index - 1 ? 'add' : 'remove';

                // Apply classes to groups
                for (let j = 0, cl, n = group.length; j < n && (cl = group[j].classList); j++) {
                    cl[afcAction](that.options.activeFragmentClass);
                    cl[cfcAction](that.options.currentFragmentClass);
                }
            }

            // Fire event
            that._fireEvent('onFragment');
            return true;
        },

        getCurrentSlideIndex: () => that._slideIndex,
        getCurrentFragmentIndex: () => that._fragmentIndex,

        // Remove shortcuts
        destroy: () => window.removeEventListener('keyup', that._keyboardInput)
    };

    // Init and return factory object
    that._init();
    return that;
}

// Export function to indentify production-version
Presentr.version = '0.0.4';

// Export factory function
module.exports = Presentr;