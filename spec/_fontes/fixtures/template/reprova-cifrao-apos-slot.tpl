<template>
  <q-table>
    <template v-slot:body="props">
      <q-td>{{ props.row }}</q-td>
    </template>
  </q-table>
  <button @click="$fechar()">Cancelar</button>
</template>
