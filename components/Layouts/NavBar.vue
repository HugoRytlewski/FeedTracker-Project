
<template>
<ul class="fixed w-screen block flex justify-center bg-neutral-900  text-white z-40 text text-lg top-0 item-center drop-shadown-2xl p-7">
    <li>
      <p @click="ScrollTop()" class="text-3xl font-extrabold text-white">
        FeedTracker
      </p>
    </li>
  </ul>
</template>

<script>
export default {
  data() {
    return {
      isShowDropdown: false,
    };
  },
};
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Electrolize&display=swap');

html {
  scroll-behavior: smooth;
}

.test{
  font-family: 'Electrolize', sans-serif;
}
.h{

  box-shadow: 0 2px 2px 1px rgba(128, 127, 127, 0.2);

}



.v-enter-active,
.v-leave-active {
  transition: all 0.5s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}
</style>
