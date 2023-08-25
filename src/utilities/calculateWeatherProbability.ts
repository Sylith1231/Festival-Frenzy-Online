//Returns probability of wetaher being GOOD in the form ["percentageChanceOfGoodWeather%","percentageChanceOfBadWeather%"] i.e. as an array of two strings.
export function calculateWeatherProbability(weather:number[]) {
  //Number of ways of obtaining each possible die roll combination from 2 - 12.
    const dieRollPossibilities = [1,2,3,4,5,6,5,4,3,2,1];
    const numberOfGoodDayRolls = weather.reduce((acc,curr,index)=>{
        return acc + curr * dieRollPossibilities[index];
    },0)
    const goodWeatherProbability = numberOfGoodDayRolls / 36;
    const goodWeatherPercentage = (Math.round(goodWeatherProbability * 1000) / 10).toString();
    const badWeatherPercentage = (Math.round((1-goodWeatherProbability) * 1000) / 10).toString();
    return [(goodWeatherPercentage+'%'),(badWeatherPercentage+'%')]
}