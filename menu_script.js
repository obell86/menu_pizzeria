document.addEventListener('DOMContentLoaded', () => {
    const menuContent = document.getElementById('menu-content');
    if (!menuContent) return;

    function addAccordionListeners() {
        const titles = menuContent.querySelectorAll('.category-title');
        titles.forEach(t => {
            t.addEventListener('click', () => toggleCategory(t));
            t.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleCategory(t);
                }
            });
        });
    }

    function toggleCategory(titleElement) {
        const div = titleElement.parentElement;
        const ul = titleElement.nextElementSibling;
        if (!ul || ul.tagName !== 'UL') return;
        const isOpen = div.classList.contains('category-open');
        if (isOpen) {
            div.classList.remove('category-open');
            ul.style.maxHeight = '0';
        } else {
            div.classList.add('category-open');
            ul.style.maxHeight = ul.scrollHeight + 'px';
        }
    }
    addAccordionListeners();
});
