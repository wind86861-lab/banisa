/**
	Template Name 	 : ClinicMaster
	Author			 : DexignZone
	
	Core script to handle the entire theme and core functions
**/

var ClinicMasterCarousel = function(){
	
	// handleTestimonialSwiper1 Swiper ==
	var handleTestimonialSwiper1 = function() {	
		if(jQuery('.testimonial-swiper1').length > 0){
			var testimonialSwiper1 = new Swiper('.testimonial-swiper1', {
				loop: true,
				spaceBetween: 20,
				slidesPerView: 1,
				autoplay: {
					delay: 3000,
				},
				navigation:{
					nextEl: ".swiper1-button-next",
					prevEl: ".swiper1-button-prev",
				},
			});
		}	
	}
	
	// handleTestimonialSwiper2 Swiper ==
	var handleTestimonialSwiper2 = function() {	
		if(jQuery('.testimonial-swiper2').length > 0){
			var testimonialSwiper2 = new Swiper('.testimonial-swiper2', {
				loop: true,
				spaceBetween: 0,
				slidesPerView: 2,
				autoplay: {
					delay: 3000,
				},
				pagination: {
					el: ".testimonial-pagination-swiper2",
					type: "progressbar",
				},
				breakpoints: {
					1481: {
						slidesPerView: 2,
					},
					1280: {
						slidesPerView: 1.6,
					},
					991: {
						slidesPerView: 1.2,
					},
					320: {
						slidesPerView: 1,
					},
				},
			});
			if($('.testimonial-slider__pagination2').length > 0){
				function mainSliderPagination(){
					var swipertotalSlide = $('.testimonial-swiper2 .swiper-slide').length;			
					var fragment = document.querySelector('.testimonial-slider__current');
					var fragment2 = document.querySelector('.testimonial-slider__total');
					var current = testimonialSwiper2.realIndex + 1;
					if (current > swipertotalSlide)
					current = 1;
					var idx = current < 10 ? ("0" + current) : current;
					var tdx = swipertotalSlide < 10 ? ("0" + swipertotalSlide) : swipertotalSlide;
					fragment2.innerHTML = (tdx);
					fragment.innerHTML = (idx);
				}
				mainSliderPagination();
				testimonialSwiper2.on('slideChange', function() {
					mainSliderPagination();
				});
			}
		}	
	}
	
	// handleTestimonialSwiper3 Swiper ==
	var handleTestimonialSwiper3 = function() {	
		if(jQuery('.testimonial-swiper3').length > 0){
			var testimonialSwiper3 = new Swiper('.testimonial-swiper3', {
				loop: true,
				spaceBetween: 0,
				slidesPerView: 1,
				autoplay: {
					delay: 3000,
				},
				pagination: {
					el: ".testimonial-pagination-swiper3",
					clickable: true,
				},
			});
		}	
	}
	
	// handleTestimonialSwiper4 Swiper ==
	var handleTestimonialSwiper4 = function() {	
		if(jQuery('.testimonial-swiper4').length > 0){
			var testimonialThumbSwiper4 = new Swiper(".testimonial-thumb-swiper4", {
				slidesPerView: "1",
				effect: "fade",
				centeredSlides: true,
			});
			var testimonialSwiper4 = new Swiper('.testimonial-swiper4', {
				loop: true,
				spaceBetween: 20,
				slidesPerView: 1,
				centeredSlides: true,
				autoplay: {
					delay: 3000,
				},
				thumbs: {
					swiper: testimonialThumbSwiper4,
				},
				navigation:{
					nextEl: ".swiper4-button-next",
					prevEl: ".swiper4-button-prev",
				},
			});
		}
	}
	
	// handleTestimonialSwiper5 Swiper ==
	var handleTestimonialSwiper5 = function() {	
		if(jQuery('.testimonial-swiper5').length > 0){
			var testimonialSwiper5 = new Swiper('.testimonial-swiper5', {
				loop: true,
				spaceBetween: 20,
				slidesPerView: 3,
				autoplay: {
					delay: 3000,
				},
				pagination: {
					el: ".testimonial-pagination-swiper2",
					type: "progressbar",
				},
				breakpoints: {
					1481: {
						slidesPerView: 3,
					},
					1280: {
						slidesPerView: 1.6,
					},
					991: {
						slidesPerView: 1.2,
					},
					320: {
						slidesPerView: 1,
					},
				},
			});
		}	
	}
	var handleTestimonialSwiper6 = function() {	
		if(jQuery('.testimonial-swiper6').length > 0){
			var testimonialSwiper5 = new Swiper('.testimonial-swiper6', {
				loop: true,
				spaceBetween: 20,
				speed:1500,
				slidesPerView: 1,
				simulateTouch: false,
				allowTouchMove: false,
				autoplay: {
					delay: 2000,
				},
			});
		}	
	}
	
	// handleAwardSlider Swiper ==
	var handleAwardSlider = function() {	
		if(jQuery('.awards-swiper').length > 0){
			var swiperBook = new Swiper('.awards-swiper', {
				loop: true,
				slidesPerView: 5,
				autoplay: {
					delay: 3000,
				},
				breakpoints: {
					1200: {
						slidesPerView: 5,
					},
					991: {
						slidesPerView: 4,
					},
					767: {
						slidesPerView: 3,
					},
					575: {
						slidesPerView: 2.5,
					},
					320: {
						slidesPerView: 1.5,
					},
				},
			});
		}
	}
	
	// handleTestimonialSwiper7 Swiper ==
	var handleTestimonialSwiper7 = function() {	
		if(jQuery('.testimonial-swiper7').length > 0){
			var testimonialSwiper7 = new Swiper('.testimonial-swiper7', {
				loop: true,
				spaceBetween: 0,
				slidesPerView: 1,
				autoplay: {
					delay: 3000,
				},
				pagination: {
					el: ".testimonial-pagination-swiper7",
					clickable: true,
				},
			});
		}	
	}
// handleTestimonialSwiper5 Swiper ==
	var handleTestimonialSwiper8 = function () {
    if (jQuery('.testimonial-swiper8').length > 0) {
        var testimonialSwiper8 = new Swiper('.testimonial-swiper8', {
            loop: true,
            spaceBetween: 25,
            slidesPerView: 1.3,
            pagination: {
                el: ".testimonial-pagination-swiper2", 
                type: "progressbar",
            },
            breakpoints: {
                1481: { 
					slidesPerView: 1.3
				},
                1280: { 
					slidesPerView: 1.6 
				},
                991: { 
					slidesPerView: 1.2 
				},
                320: { 
					slidesPerView: 1 
				},
            },
        });

        // custom current/total
        function mainSliderPagination() {
            var swipertotalSlide = testimonialSwiper8.slides.length - testimonialSwiper8.loopedSlides * 2;
            var fragment = document.querySelector('.testimonial-slider__current');
            var fragment2 = document.querySelector('.testimonial-slider__total');

            var current = testimonialSwiper8.realIndex + 1;
            if (current > swipertotalSlide) current = 1;

            var idx = current < 10 ? ("0" + current) : current;
            var tdx = swipertotalSlide < 10 ? ("0" + swipertotalSlide) : swipertotalSlide;

            fragment.innerHTML = idx;
            fragment2.innerHTML = tdx;
        }

        mainSliderPagination();

        testimonialSwiper8.on('slideChange', function () {
            mainSliderPagination();
        });
    }
}


	// handleDzTeamSwiper1 Swiper ==
	var handleDzTeamSwiper1 = function() {	
		if(jQuery('.dz-team-swiper1').length > 0){
			var teamSwiperThumb = new Swiper(".dz-team-swiper1-thumb", {
				slidesPerView: "2",
				grid:{
					rows: 2,
				},
				autoplay: {
					delay: 3000,
				},
				breakpoints: {
					320: {
						slidesPerView: 1.2,
						grid:{
							rows: 1,
						},
					},
					591: {
						slidesPerView: 2,
					},
					991: {
						slidesPerView: 3,
					},
					1200: {
						slidesPerView: 2,
					},
				}
			});
			var teamSwiper = new Swiper(".dz-team-swiper1", {
				slidesPerView: "1",
				effect: "fade",
				thumbs: {
					swiper: teamSwiperThumb,
				},
				pagination: {
					el: ".team-progressbar-swiper",
					type: "progressbar",
				},
				navigation: {
					nextEl: ".team-swiper-next",
					prevEl: ".team-swiper-prev",
				},
			});
			if($('.team-pagination-swiper').length > 0){
				function mainSliderPagination(){
					var swipertotalSlide = $('.dz-team-swiper1 .swiper-slide').length;			
					var fragment = document.querySelector('.team-slider__current');
					var fragment2 = document.querySelector('.team-slider__total');
					var current = teamSwiper.realIndex + 1;
					if (current > swipertotalSlide)
					current = 1;
					var idx = current < 10 ? ("0" + current) : current;
					var tdx = swipertotalSlide < 10 ? ("0" + swipertotalSlide) : swipertotalSlide;
					fragment2.innerHTML = (tdx);
					fragment.innerHTML = (idx);
				}
				mainSliderPagination();
				teamSwiper.on('slideChange', function() {
					mainSliderPagination();
				});
			}
		}
	}
	
	// Project Carousel Swiper ==
	var handleVerticalSwiper = function() {	
		if(jQuery('.blog-vertical-swiper').length > 0){
			var teamSwiperThumb = new Swiper(".blog-vertical-swiper-thumb", {
				direction: "vertical",
				slidesPerView: "3",
				mousewheel: false,
				spaceBetween: 10,
				autoplay: {
					delay: 3000,
				},
				breakpoints: {
					320: {
						slidesPerView: 1,
						direction: "horizontal",
					},
					767: {
						slidesPerView: 2,
						direction: "vertical",
					},
					1191: {
						slidesPerView: 3,
					},
				}
			});
			var teamSwiper = new Swiper(".blog-vertical-swiper", {
				slidesPerView: "1",
				effect: "fade",
				grabCursor: true,
				thumbs: {
					swiper: teamSwiperThumb,
				},
				navigation: {
					nextEl: ".blog-swiper-next",
					prevEl: ".blog-swiper-prev",
				},
			});
		}
	}

	// Project Carousel Swiper ==
	var handleVerticalSwiper2 = function() {	
		if(jQuery('.blog-vertical-swiper2').length > 0){
			var teamSwiperThumb = new Swiper(".blog-vertical-swiper-thumb2", {
				direction: "vertical",
				slidesPerView: "3",
				mousewheel: false,
				spaceBetween: 10,

				autoplay: {
					delay: 3000,
				},
				breakpoints: {
					320: {
						slidesPerView: 1,
						direction: "horizontal",
					},
					767: {
						slidesPerView: 2,
						direction: "vertical",
					},
					1191: {
						slidesPerView: 3,
					},
				}
			});
			var teamSwiper = new Swiper(".blog-vertical-swiper2", {
				slidesPerView: "1",
				effect: "fade",
				grabCursor: true,
				thumbs: {
					swiper: teamSwiperThumb,
				},
				navigation: {
					nextEl: ".blog-swiper-next",
					prevEl: ".blog-swiper-prev",
				},
			});
		}
	}

	// handleAwardSlider Swiper ==
	var handleClientSwiper = function() {	
		if(jQuery('.client-swiper').length > 0){
			var swiperClient = new Swiper('.client-swiper', {
				loop: true,
				slidesPerView: 5,
				spaceBetween: 30,
				autoplay: {
					delay: 3000,
				},
				breakpoints: {
					1200: {
						slidesPerView: 6,
					},
					991: {
						slidesPerView: 4,
					},
					575: {
						slidesPerView: 3,
					},
					320: {
						slidesPerView: 2,
					},
				},
			});
		}
	}
	
	// handleAwardSlider Swiper 2 ==
	var handleClientSwiper2 = function() {	
		if(jQuery('.client-swiper2').length > 0){
			var swiperClient = new Swiper('.client-swiper2', {
				loop: true,
				slidesPerView: 4,
				spaceBetween: 30,
				autoplay: {
					delay: 3000,
				},
				breakpoints: {
					767: {
						slidesPerView: 4,
					},
					575: {
						slidesPerView: 3,
					},
					320: {
						slidesPerView: 2,
					},
				},
			});
		}
	}
	
	var handleDzFlexSwiper = function () {
		if (jQuery('.dz-flex-swiper').length > 0) {
			var swiper = new Swiper('.dz-flex-swiper', {
				speed: 500,
				loop: false,
				slidesPerView: 'auto',
				spaceBetween: 0,
				autoplay: {
					delay: 3000,
				},
				breakpoints: {
					991: {
				 		slidesPerView: 'auto',
				 	},
					320: {
				 		slidesPerView: 1,
				 	},
				}
			});
		}
	}
	
	// handleTestimonialSwiper2 Swiper ==
	var handleCompareSwiper = function() {	
		if(jQuery('.compare-swiper').length > 0){
			var compareSwiper = new Swiper(".compare-swiper", {
				loop: true,
				slidesPerView: 4,
				spaceBetween: 20,
				centeredSlides: true,
				autoplay: {
					delay: 3000,
				},
				navigation: {
					nextEl: ".compare-swiper-next",
					prevEl: ".compare-swiper-prev",
				},
				pagination: {
					el: ".compare-pagination-swiper",
					type: "progressbar",
				},
				breakpoints: {
					1481: {
						slidesPerView: 4.4,
					},
					1280: {
						slidesPerView: 4,
					},
					991: {
						slidesPerView: 3.5
					},
					320: {
						slidesPerView: 2,
					},
				},
			});
			if($('.compare-slider__pagination').length > 0){
				function mainSliderPagination(){
					var swipertotalSlide = $('.compare-swiper .swiper-slide').length;			
					var fragment = document.querySelector('.compare-slider__current');
					var fragment2 = document.querySelector('.compare-slider__total');
					var current = compareSwiper.realIndex + 1;
					if (current > swipertotalSlide)
					current = 1;
					var idx = current < 10 ? ("0" + current) : current;
					var tdx = swipertotalSlide < 10 ? ("0" + swipertotalSlide) : swipertotalSlide;
					fragment2.innerHTML = (tdx);
					fragment.innerHTML = (idx);
				}
				mainSliderPagination();
				compareSwiper.on('slideChange', function() {
					mainSliderPagination();
				});
			}
		}	
	}

	// handleTestimonialSwiper2 Swiper ==
	var handleCompareSwiper2 = function() {	
		if(jQuery('.compare-swiper-2').length > 0){
			var compareSwiper = new Swiper(".compare-swiper-2", {
				loop: true,
				slidesPerView: 3,
				spaceBetween: 20,
				centeredSlides: true,
				autoplay: {
					delay: 3000,
				},
				navigation: {
					nextEl: ".compare-swiper-2-next",
					prevEl: ".compare-swiper-2-prev",
				},
				pagination: {
					el: ".compare-pagination-swiper",
					type: "progressbar",
				},
				breakpoints: {
					1481: {
						slidesPerView: 2.6,
					},
					1280: {
						slidesPerView: 3,
					},
					991: {
						slidesPerView: 3,
					},
					320: {
						slidesPerView: 2,
					},
				},
			});
			if($('.compare-slider__pagination').length > 0){
				function mainSliderPagination(){
					var swipertotalSlide = $('.compare-swiper-2 .swiper-slide').length;			
					var fragment = document.querySelector('.compare-slider__current');
					var fragment2 = document.querySelector('.compare-slider__total');
					var current = compareSwiper.realIndex + 1;
					if (current > swipertotalSlide)
					current = 1;
					var idx = current < 10 ? ("0" + current) : current;
					var tdx = swipertotalSlide < 10 ? ("0" + swipertotalSlide) : swipertotalSlide;
					fragment2.innerHTML = (tdx);
					fragment.innerHTML = (idx);
				}
				mainSliderPagination();
				compareSwiper.on('slideChange', function() {
					mainSliderPagination();
				});
			}
		}	
	}

	// handleDummySwiper Swiper ==
	var handleDummySwiper = function() {	
		if(jQuery('.dummy-swiper').length > 0){
			var DummySwiper = new Swiper('.dummy-swiper', {
				loop: false,
				spaceBetween: 0,
				slidesPerView: 9,
				autoplay: {
					delay: 3000,
				},

				breakpoints: {
					1481: {
						slidesPerView: 9,
					},
					1400: {
						slidesPerView: 8,
					},
					1280: {
						slidesPerView: 7,
					},
					1199: {
						slidesPerView: 7,
					},
					991: {
						slidesPerView: 6,
					},
					768: {
						slidesPerView: 5,
					},
					320: {
						slidesPerView: 3,
					},
				},
			});
		}	
	}
	// handleServicesSwiper Swiper ==
	var handleServiceSwiper = function() {	
		if(jQuery('.service-swiper').length > 0){
			var ServiceSwiper = new Swiper('.service-swiper', {
				loop: true,
				spaceBetween: 20,
				slidesPerView: 3,
				autoplay: {
					delay: 3000,
				},

				breakpoints: {
					1481: {
						slidesPerView: 3,
					},
					1200: {
						slidesPerView: 3,
					},
					1024: {
						slidesPerView: 2,
					},
					991: {
						slidesPerView: 2,
					},
					768: {
						slidesPerView: 2,
					},
					576: {
						slidesPerView: 2,
					},
					320: {
						slidesPerView: 1,
					},
				},
				navigation: {
					nextEl: ".service-button-next",
					prevEl: ".service-button-prev",
				},
				pagination: {
					el: ".swiper-pagination",
					clickable: true,
					renderBullet: function (index, className) {
						return '<span class="' + className + '">' + "0" + (index + 1) + "</span>";
					},
				},
			});
		}	
	}

	
		var handleServiceSwiper2 = function() {	
		if(jQuery('.service-swiper2').length > 0){
			var ServiceSwiper2 = new Swiper('.service-swiper2', {
				loop: true,
				spaceBetween: 0,
				slidesPerView: 1,
				autoplay: {
					delay: 3000,
				},

				
				navigation: {
					nextEl: ".service-button-next",
					prevEl: ".service-button-prev",
				},
				pagination: {
					el: ".swiper-pagination",
					clickable: true,
					renderBullet: function (index, className) {
						return '<span class="' + className + '">' + "0" + (index + 1) + "</span>";
					},
				},
			});
		}	
	}
	// Portfolio Slider
	if(jQuery('.portfolio-slider').length > 0){
		var swiper = new Swiper('.portfolio-slider', {
			speed: 1500,
			slidesPerView: 6.5,
			spaceBetween: 0,
			loop:true,
			autoplay: {
			   delay: 2000,
			},
			breakpoints: {
				1600: {
					slidesPerView: 6.5,
				},
				1480: {
					slidesPerView: 7,
				},
				768: {
					slidesPerView: 4,
				},
				320: {
					slidesPerView: 2,
				},
			}
		});
	}
	function initSliders() {
		var swiper = new Swiper(".dzThumbSlider", {
			spaceBetween: 10,
			slidesPerView: 9,
			freeMode: true,
			loop: true,
			watchSlidesProgress: true,

			breakpoints: {
				1680: {
					slidesPerView: 9,
				},
				1480: {
					slidesPerView: 6,
				},
				1280: {
					slidesPerView: 6,
				},
				991: {
					slidesPerView: 6,
				},
				768: {
					slidesPerView: 5,
				},
				320: {
					slidesPerView: 3,
				},
			},
		});

		var swiper2 = new Swiper(".dzThumbPreview", {
			spaceBetween: 10,
			loop: true,
			navigation: {
				nextEl: ".swiper-button-next",
				prevEl: ".swiper-button-prev",
			},
			autoplay: {
				delay: 3000,
			},
			thumbs: {
				swiper: swiper,
			},
			pagination: {
				el: ".testimonial-pagination-swiper",
				clickable: true,
			},
		});
	}

	/* Function ============ */
	return {
		init:function(){
			handleTestimonialSwiper1();
			handleTestimonialSwiper2();
			handleTestimonialSwiper3();
			handleTestimonialSwiper4();
			handleTestimonialSwiper5();
			handleTestimonialSwiper6();
			handleTestimonialSwiper7();
			handleTestimonialSwiper8();
			// handleAwardSlider();
			handleDzTeamSwiper1();
			handleClientSwiper();
			handleClientSwiper2();
			handleVerticalSwiper();
			handleVerticalSwiper2();
			handleDzFlexSwiper();
			handleCompareSwiper();
			handleCompareSwiper2();
			handleDummySwiper();
			handleServiceSwiper();
			handleServiceSwiper2();
			initSliders();
		},

		load:function(){
			
		},
		
		resize:function(){
			handleVerticalSwiper();
		}
	}
	
}();


/* Document.ready Start */	
jQuery(document).ready(function() {
    'use strict';
	
	ClinicMasterCarousel.init();
	
	
});
/* Document.ready END */

/* Window Load START */
jQuery(window).on('load',function () {
	'use strict'; 
	ClinicMasterCarousel.load();

	
});
/*  Window Load END */

/* Window Resize START */
jQuery(window).on('resize',function () {
	'use strict'; 
	ClinicMasterCarousel.resize();
});
/*  Window Resize END */